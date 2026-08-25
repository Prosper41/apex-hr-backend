import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { registerTenant } from '../../support/helpers/auth-fixtures.helper';

describe('POST /v1/auth/change-password (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MockMailService;
  const tracker = new TestDataTracker();

  let accessToken: string;
  let userEmail: string;
  let oldPassword: string;

  beforeAll(async () => {
    ({ app, prisma, mailService } = await createTestApp());

    const tenant = await registerTenant(
      app,
      mailService,
      tracker,
      'change-pw-user',
    );
    accessToken = tenant.accessToken;
    userEmail = tenant.email;
    oldPassword = tenant.plainPassword;
  });

  afterAll(async () => {
    await tracker.cleanup(prisma);
    await app.close();
  });

  it('should change password with correct old password [High]', async () => {
    // Arrange
    const newPassword = 'BrandNew@456';

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword, newPassword });

    // Assert - API response
    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/password changed successfully/i);

    // Assert - DB: mustChangePassword cleared
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    expect(user!.mustChangePassword).toBe(false);

    // Assert - can log in with the new password
    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: newPassword });
    expect(loginResponse.status).toBe(201);

    // keep state consistent for subsequent tests in this file
    oldPassword = newPassword;
  });

  it('should reject change-password with wrong old password with 401 [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword: 'WrongOld@123', newPassword: 'Whatever@789' });

    // Assert
    expect(response.status).toBe(401);
  });

  it('should reject a new password that fails the complexity regex with 400 [Medium]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword, newPassword: 'weak' });

    // Assert
    expect(response.status).toBe(400);
  });

  it('should reject the request with no token with 401 [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/change-password')
      .send({ oldPassword, newPassword: 'Another@123' });

    // Assert
    expect(response.status).toBe(401);
  });
});
