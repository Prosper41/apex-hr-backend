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

  // type: () => true forces raw parsing regardless of Content-Type header —
  // Sentry's internal tunnel transport doesn't always set one.
  app.use(
    '/v1/sentry-tunnel',
    express.raw({ type: () => true, limit: '10mb' }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.enableCors({ origin: '*' });
  app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('/v1');

  const config = new DocumentBuilder()
    .setTitle('APEX HR')
    .setDescription(
      'The base API URL is localhost:3000, or check your console to see where the app is running',
    )

    // .addServer('https://jamika-unexaggerating-camila.ngrok-free.dev/')
    .addServer('https://apex-hr-gray.vercel.app/')

    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      requestInterceptor: (req: any) => {
        req.headers['ngrok-skip-browser-warning'] = 'true';
        return req;
      },
    },
  });

  await app.listen(process.env.PORT ?? 3006);
  console.log(
    `Application running on: http://localhost:${process.env.PORT ?? 3002}/v1`,
  );
  console.log(
    `Swagger UI available at: http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}
bootstrap();
