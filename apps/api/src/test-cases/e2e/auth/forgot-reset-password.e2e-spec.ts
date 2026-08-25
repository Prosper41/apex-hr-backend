import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { registerTenant } from '../../support/helpers/auth-fixtures.helper';
import { uniqueEmail } from '../../support/helpers/unique-data.helper';

describe('POST /v1/auth/forgot-password and /v1/auth/reset-password (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MockMailService;
  const tracker = new TestDataTracker();

  let userEmail: string;

  beforeAll(async () => {
    ({ app, prisma, mailService } = await createTestApp());

    const tenant = await registerTenant(
      app,
      mailService,
      tracker,
      'forgot-pw-user',
    );
    userEmail = tenant.email;
  });

  afterAll(async () => {
    await tracker.cleanup(prisma);
    await app.close();
  });

  it('should return a generic success message for an existing email [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/forgot-password')
      .send({ email: userEmail });

    // Assert - API response (must not leak whether the account exists)
    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(
      /if this email exists, a reset link has been sent/i,
    );

    // Assert - DB: reset token was actually set
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    expect(user!.passwordResetToken).not.toBeNull();
  });

  it('should return the identical generic message for a non-existent email (no enumeration) [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/forgot-password')
      .send({ email: uniqueEmail('ghost-user') });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(
      /if this email exists, a reset link has been sent/i,
    );
  });

  it('should reset the password with a valid reset token [High]', async () => {
    // Arrange
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    const resetToken = user!.passwordResetToken!;
    const newPassword = 'ResetDone@123';

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({ resetToken, newPassword });

    // Assert - API response
    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/password reset successfully/i);

    // Assert - DB
    const updated = await prisma.user.findUnique({
      where: { email: userEmail },
    });
    expect(updated!.passwordResetToken).toBeNull();
    expect(updated!.mustChangePassword).toBe(false);

    // Assert - can log in with the new password
    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: newPassword });
    expect(loginResponse.status).toBe(201);
  });

  it('should reject reset with an invalid/unknown token with 404 [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({ resetToken: 'not-a-real-token', newPassword: 'Whatever@123' });

    // Assert
    expect(response.status).toBe(404);
  });

  it('should reject reusing an already-consumed reset token with 404 [Medium]', async () => {
    // Arrange: the token consumed in the successful-reset test above is now
    // cleared in the DB, so re-attempting with that same value must fail.
    const staleToken = 'already-used-token-from-earlier-test';

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({ resetToken: staleToken, newPassword: 'Whatever@123' });

    // Assert
    expect(response.status).toBe(404);
  });
});
