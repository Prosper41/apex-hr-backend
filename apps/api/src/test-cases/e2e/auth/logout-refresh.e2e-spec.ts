import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { registerTenant } from '../../support/helpers/auth-fixtures.helper';

describe('POST /v1/auth/logout and /v1/auth/refresh (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MockMailService;
  const tracker = new TestDataTracker();

  let refreshToken: string;

  beforeEach(async () => {
    if (!app) {
      ({ app, prisma, mailService } = await createTestApp());
    }
    // Arrange: fresh tenant + tokens for every test, so token
    // rotation/blacklisting in one test never affects another.
    const tenant = await registerTenant(
      app,
      mailService,
      tracker,
      'refresh-tester',
    );
    refreshToken = tenant.refreshToken;
  });

  afterAll(async () => {
    await tracker.cleanup(prisma);
    await app.close();
  });

  it('should issue a new token pair on valid refresh and rotate the old token [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken });

    // Assert - API response
    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.refreshToken).not.toBe(refreshToken);

    // Assert - DB: old token deleted
    const oldToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    expect(oldToken).toBeNull();

    // Assert - reusing the old (rotated) token must fail
    const reuseResponse = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken });
    expect(reuseResponse.status).toBe(401);
  });

  it('should reject an unknown refresh token with 401 [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: 'not-a-real-token-uuid' });

    // Assert
    expect(response.status).toBe(401);
  });

  it('should reject an expired refresh token and delete it from the DB with 401 [Medium]', async () => {
    // Arrange: force the token to be expired
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/expired/i);

    const deleted = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    expect(deleted).toBeNull();
  });

  it('should logout successfully and invalidate the refresh token [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refreshToken });

    // Assert - API response
    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/successfully logged out/i);

    // Assert - DB
    const tokenRow = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    expect(tokenRow).toBeNull();

    // Assert - the token can no longer be used to refresh
    const refreshAfterLogout = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('should reject logout with an unknown refresh token with 401 [Medium]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refreshToken: 'garbage-token-value' });

    // Assert
    expect(response.status).toBe(401);
  });
});
