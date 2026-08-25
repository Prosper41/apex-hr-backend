import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { registerTenant } from '../../support/helpers/auth-fixtures.helper';
import { uniqueEmail } from '../../support/helpers/unique-data.helper';

describe('POST /v1/auth/login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MockMailService;
  const tracker = new TestDataTracker();

  let userEmail: string;
  let plainPassword: string;

  beforeAll(async () => {
    ({ app, prisma, mailService } = await createTestApp());

    // Arrange (suite-level): a known tenant admin to log in as.
    const tenant = await registerTenant(
      app,
      mailService,
      tracker,
      'login-user',
    );
    userEmail = tenant.email;
    plainPassword = tenant.plainPassword;
  });

  afterAll(async () => {
    await tracker.cleanup(prisma);
    await app.close();
  });

  it('should login successfully with correct credentials [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: plainPassword });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.email).toBe(userEmail);
    expect(response.body.user.password).toBeUndefined();

    const tokenRow = await prisma.refreshToken.findUnique({
      where: { token: response.body.refreshToken },
    });
    expect(tokenRow).not.toBeNull();
    expect(tokenRow!.userId).toBe(response.body.user.id);
  });

  it('should reject login with wrong password with 401 [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: 'WrongPass@123' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid credentials/i);
  });

  it('should reject login for a non-existent email with 401 [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: uniqueEmail('does-not-exist'), password: 'Whatever@123' });

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid credentials/i);
  });

  it('should reject a malformed email with 400 [Low]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Whatever@123' });

    // Assert
    expect(response.status).toBe(400);
  });

  it('DOCUMENTS: global email uniqueness prevents ambiguous login targets [Medium]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register-tenant')
      .send({
        firstName: 'Dup',
        lastName: 'Email',
        email: userEmail, // already registered above
        companyName: `ApexTest DupLoginEmail ${Date.now()}`,
      });

    // Assert
    expect(response.status).toBe(409);
  });
});
