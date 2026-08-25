import { Role } from '@prisma/client';

export interface JwtPayLoad {
  userId: string;
  email: string;
  role: Role;
  tenantId: string;
  departmentId: string | null;
  firstName: string;
  lastName: string;
}
