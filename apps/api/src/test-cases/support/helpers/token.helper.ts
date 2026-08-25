import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  tenantId: string;
  departmentId: string | null;
}

/**
 * Signs a real access token directly via JwtService, bypassing the login
 * flow entirely. Used for Arrange-phase users created straight in the DB
 * (no known plaintext password), so leave-request tests are isolated from
 * the login flow, which already has its own dedicated spec file.
 */
export function signAccessToken(
  app: INestApplication,
  payload: TokenPayload,
): string {
  const jwt = app.get(JwtService);
  return jwt.sign(payload, { secret: process.env.JWT_ACCESS_SECRET });
}
