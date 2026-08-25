import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';
import { uniqueEmail } from './unique-data.helper';
import { TestDataTracker } from './test-data-tracker.helper';
import { signAccessToken } from './token.helper';

export interface UserFixture {
  id: string;
  email: string;
  role: Role;
  departmentId: string | null;
  tenantId: string;
  accessToken: string;
}

/**
 * Creates a user directly via Prisma — bypassing the register API, which
 * has its own dedicated spec file under e2e/auth — and signs a real
 * access token for it. This keeps leave-request Arrange steps fast and
 * focused purely on the leave-request behavior under test.
 */
export async function createUserFixture(
  app: INestApplication,
  prisma: PrismaService,
  tracker: TestDataTracker,
  params: {
    tenantId: string;
    departmentId?: string | null;
    role: Role;
    labelPrefix: string;
  },
): Promise<UserFixture> {
  const email = uniqueEmail(params.labelPrefix);
  const hashedPassword = await bcrypt.hash('Irrelevant@123', 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: params.labelPrefix.slice(0, 30),
      lastName: 'Fixture',
      role: params.role,
      departmentId: params.departmentId ?? null,
      tenantId: params.tenantId,
      mustChangePassword: false,
    },
  });

  tracker.trackUserEmail(email);

  const accessToken = signAccessToken(app, {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    departmentId: user.departmentId,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    tenantId: user.tenantId,
    accessToken,
  };
}
