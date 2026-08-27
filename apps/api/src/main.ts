import 'dotenv/config';
import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  /*
   * ---------------------------------------------------------
   * BODY PARSING
   * ---------------------------------------------------------
   */

  // Sentry tunnel needs the raw request body.
  app.use(
    '/v1/sentry-tunnel',
    express.raw({
      type: () => true,
      limit: '10mb',
    }),
  );

  // Normal JSON requests
  app.use(express.json());

  // Form-urlencoded requests
  app.use(
    express.urlencoded({
      extended: true,
    }),
  );

  /*
   * ---------------------------------------------------------
   * CORS
   * ---------------------------------------------------------
   */

  const frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ).replace(/\/$/, '');

  app.enableCors({
    origin: [
      frontendUrl,
      'https://apex-hr-gray.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  });

  /*
   * ---------------------------------------------------------
   * LOGGER
   * ---------------------------------------------------------
   */

  app.useLogger([
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
  ]);

  /*
   * ---------------------------------------------------------
   * VALIDATION
   * ---------------------------------------------------------
   */

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /*
   * ---------------------------------------------------------
   * API PREFIX
   * ---------------------------------------------------------
   */

  app.setGlobalPrefix('v1');

  /*
   * ---------------------------------------------------------
   * SWAGGER
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Do NOT put /v1 in addServer().
   *
   * NestJS Swagger already generates paths such as:
   *
   * /v1/auth/login
   * /v1/auth/forgot-password
   *
   * Therefore the server must be:
   *
   * https://apex-hr-backend.onrender.com
   */

  const config = new DocumentBuilder()
    .setTitle('APEX HR API')
    .setDescription(
      'APEX HR Human Resources Management API',
    )
    .addServer(
      'https://apex-hr-backend.onrender.com',
      'Production',
    )
    .addServer(
      'http://localhost:3007',
      'Local Development',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(
    app,
    config,
  );

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  /*
   * ---------------------------------------------------------
   * START SERVER
   * ---------------------------------------------------------
   */

  const port = Number(process.env.PORT) || 3006;

  await app.listen(port);

  console.log(
    `APEX HR API running on port ${port}`,
  );

  console.log(
    `API Base URL: https://apex-hr-backend.onrender.com/v1`,
  );

  console.log(
    `Swagger UI: https://apex-hr-backend.onrender.com/api`,
  );
}

bootstrap();
