import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../../app.module';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { MailService } from '@infra/mail/mail.service';
import { createMockMailService, MockMailService } from './mail.mock';

export interface TestAppContext {
  app: INestApplication;
  prisma: PrismaService;
  mailService: MockMailService;
}

export async function createTestApp(): Promise<TestAppContext> {
  const mockMailService = createMockMailService();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useValue(mockMailService)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma, mailService: mockMailService };
}
