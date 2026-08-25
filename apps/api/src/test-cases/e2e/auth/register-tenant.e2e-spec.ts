import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import {
  uniqueEmail,
  uniqueCompanyName,
} from '../../support/helpers/unique-data.helper';

describe('POST /v1/auth/register-tenant (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MockMailService;
  const tracker = new TestDataTracker();

  // Reused across the "duplicate company" and "duplicate email" tests.
  let firstCompanyName: string;
  let firstEmail: string;

  beforeAll(async () => {
    ({ app, prisma, mailService } = await createTestApp());
  });

  afterAll(async () => {
    await tracker.cleanup(prisma);
    await app.close();
  });

  it('should register a new tenant and its TENANT_ADMIN [High]', async () => {
    // Arrange
    firstEmail = uniqueEmail('tenant-admin-happy');
    firstCompanyName = uniqueCompanyName('happy-path');
    const dto = {
      firstName: 'Ama',
      lastName: 'Owusu',
      email: firstEmail,
      companyName: firstCompanyName,
      companyType: 'Software Development',
      companyPhone: '+233201234567',
      companyLocation: 'Accra, Ghana',
    };

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register-tenant')
      .send(dto);

    // Assert - API response
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      tenant: { name: dto.companyName },
      user: { email: dto.email, role: Role.TENANT_ADMIN },
    });
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.password).toBeUndefined();

    // Assert - DB changes
    const tenant = await prisma.tenant.findUnique({
      where: { name: dto.companyName },
      include: { users: true },
    });
    expect(tenant).not.toBeNull();
    expect(tenant!.users).toHaveLength(1);
    expect(tenant!.users[0].role).toBe(Role.TENANT_ADMIN);
    expect(tenant!.users[0].mustChangePassword).toBe(true);

    // Assert - notification attempted
    expect(mailService.sendTenantWelcomeEmail).toHaveBeenCalledWith(
      dto.email,
      dto.firstName,
      dto.companyName,
      expect.any(String),
    );

    tracker.trackTenant(tenant!.id);
    tracker.trackUserEmail(dto.email);
  });

  it('should reject duplicate company name with 409 [High]', async () => {
    // Arrange
    const dto = {
      firstName: 'Kwame',
      lastName: 'Mensah',
      email: uniqueEmail('tenant-admin-dupe-company'),
      companyName: firstCompanyName, // same as previous test
    };

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register-tenant')
      .send(dto);

    // Assert
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/company.*already exists/i);

    const user = await prisma.user.findFirst({ where: { email: dto.email } });
    expect(user).toBeNull();
  });

  it('should reject registration with an already-used email with 409 [High]', async () => {
    // Arrange
    const dto = {
      firstName: 'Yaw',
      lastName: 'Boateng',
      email: firstEmail, // duplicate of first test
      companyName: uniqueCompanyName('dupe-email'),
    };

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register-tenant')
      .send(dto);

    // Assert - current app-level behavior: clean 409, not a DB-constraint 500.
    // See auth handler notes: email is globally @unique in the schema but
    // RegisterUserHandler/RegisterTenantHandler only pre-check within a
    // tenant scope for the *user* registration path. This test locks in
    // that register-tenant itself is safe; the equivalent gap for
    // cross-tenant `register` (employee) is covered separately.
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/i);

    const tenant = await prisma.tenant.findFirst({
      where: { name: dto.companyName },
    });
    expect(tenant).toBeNull();
  });

  it('should reject payload missing required fields with 400 [Medium]', async () => {
    // Arrange
    const dto = { firstName: 'NoLastName' };

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register-tenant')
      .send(dto);

    // Assert
    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('should reject unknown/extra fields due to whitelist validation with 400 [Low]', async () => {
    // Arrange
    const dto = {
      firstName: 'Extra',
      lastName: 'Field',
      email: uniqueEmail('tenant-admin-extra'),
      companyName: uniqueCompanyName('extra-field'),
      notAllowedField: 'should be rejected',
    };

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register-tenant')
      .send(dto);

    // Assert
    expect(response.status).toBe(400);
  });
});
