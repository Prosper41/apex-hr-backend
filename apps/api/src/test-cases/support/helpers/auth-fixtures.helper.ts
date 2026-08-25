import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { MockMailService } from '../setup/mail.mock';
import { uniqueEmail, uniqueCompanyName } from './unique-data.helper';
import { TestDataTracker } from './test-data-tracker.helper';

export interface RegisteredTenant {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  email: string;
  plainPassword: string;
}

export async function registerTenant(
  app: INestApplication,
  mailService: MockMailService,
  tracker: TestDataTracker,
  labelPrefix: string,
  overrides: Partial<{ firstName: string; lastName: string }> = {},
): Promise<RegisteredTenant> {
  const email = uniqueEmail(labelPrefix);
  const companyName = uniqueCompanyName(labelPrefix);

  mailService.sendTenantWelcomeEmail.mockClear();

  const response = await request(app.getHttpServer())
    .post('/v1/auth/register-tenant')
    .send({
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'Admin',
      email,
      companyName,
    });

  if (response.status !== 201) {
    throw new Error(
      `registerTenant fixture failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  const plainPassword = mailService.sendTenantWelcomeEmail.mock.calls[0][3];

  tracker.trackTenant(response.body.tenant.id);
  tracker.trackUserEmail(email);

  return {
    tenantId: response.body.tenant.id,
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
    email,
    plainPassword,
  };
}
