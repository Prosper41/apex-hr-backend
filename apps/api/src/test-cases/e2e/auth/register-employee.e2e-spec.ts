import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { registerTenant } from '../../support/helpers/auth-fixtures.helper';
import { createDepartmentFixture } from '../../support/helpers/department-fixtures.helper';
import { uniqueEmail } from '../../support/helpers/unique-data.helper';

describe('POST /v1/auth/register (employee) (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MockMailService;
  const tracker = new TestDataTracker();

  let tenantId: string;
  let tenantAdminToken: string;
  let departmentId: string;
  let registeredEmployeeEmail: string;

  beforeAll(async () => {
    ({ app, prisma, mailService } = await createTestApp());

    // Arrange (suite-level): tenant + department to register employees into.
    const tenant = await registerTenant(
      app,
      mailService,
      tracker,
      'register-emp-admin',
    );
    tenantId = tenant.tenantId;
    tenantAdminToken = tenant.accessToken;

    const department = await createDepartmentFixture(prisma, tenantId, 'HR');
    departmentId = department.id;
  });

  afterAll(async () => {
    if (registeredEmployeeEmail)
      tracker.trackUserEmail(registeredEmployeeEmail);
    await tracker.cleanup(prisma);
    await app.close();
  });

  it('should allow TENANT_ADMIN to register an employee [High]', async () => {
    // Arrange
    registeredEmployeeEmail = uniqueEmail('new-employee');
    const dto = {
      firstName: 'New',
      lastName: 'Employee',
      email: registeredEmployeeEmail,
      role: Role.EMPLOYEE,
      departmentId,
    };

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send(dto);

    // Assert - API response
    expect(response.status).toBe(201);
    expect(response.body.userWithoutPassword.email).toBe(
      registeredEmployeeEmail,
    );
    expect(response.body.userWithoutPassword.password).toBeUndefined();

    // Assert - DB
    const created = await prisma.user.findFirst({
      where: { email: registeredEmployeeEmail, tenantId },
    });
    expect(created).not.toBeNull();
    expect(created!.role).toBe(Role.EMPLOYEE);
    expect(created!.departmentId).toBe(departmentId);
    expect(created!.mustChangePassword).toBe(true);
  });

  it('should reject registration with no auth token with 401 [High]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        firstName: 'No',
        lastName: 'Token',
        email: uniqueEmail('no-token'),
        role: Role.EMPLOYEE,
        departmentId,
      });

    // Assert
    expect(response.status).toBe(401);
  });

  it('should reject registration attempted by an EMPLOYEE role with 403 [High]', async () => {
    // Arrange: forge an EMPLOYEE-role token directly. We isolate this RBAC
    // check from the login flow because RegisterUserHandler never issues
    // tokens for newly created employees (only a temp password by email).
    const employee = await prisma.user.findFirst({
      where: { email: registeredEmployeeEmail },
    });
    const jwt = app.get(JwtService);
    const forgedToken = jwt.sign(
      {
        userId: employee!.id,
        email: employee!.email,
        role: Role.EMPLOYEE,
        tenantId,
        departmentId,
      },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
    const blockedEmail = uniqueEmail('employee-cannot-register');

    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .set('Authorization', `Bearer ${forgedToken}`)
      .send({
        firstName: 'Should',
        lastName: 'Fail',
        email: blockedEmail,
        role: Role.EMPLOYEE,
        departmentId,
      });

    // Assert
    expect(response.status).toBe(403);

    const shouldNotExist = await prisma.user.findFirst({
      where: { email: blockedEmail },
    });
    expect(shouldNotExist).toBeNull();
  });

  it('should reject a malformed Bearer header with 401 [Low]', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .set('Authorization', tenantAdminToken) // missing "Bearer " prefix
      .send({
        firstName: 'Bad',
        lastName: 'Header',
        email: uniqueEmail('bad-header'),
        role: Role.EMPLOYEE,
        departmentId,
      });

    // Assert
    expect(response.status).toBe(401);
  });
});
