import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';

export interface ResolvedActor {
  id: string;
  role: Role;
  departmentId: string | null;
  tenantId: string;
}

const logger = new Logger('LeaveRequestAccessHelper');

/**
 * An "unscoped" actor isn't limited to reviewing requests from their own
 * department — they oversee everything tenant-wide. That's true for:
 *  - TENANT_ADMIN, always
 *  - HR_ADMIN, but only when they actually belong to the tenant's
 *    designated HR department (Tenant.hrDepartmentId) — an HR_ADMIN
 *    sitting in a non-HR department shouldn't see every request either.
 */
export async function computeIsUnscoped(
  prisma: PrismaService,
  actor: ResolvedActor,
): Promise<boolean> {
  if (actor.role === Role.TENANT_ADMIN) {
    logger.debug(`Actor ${actor.id} is TENANT_ADMIN — unscoped`);
    return true;
  }

  if (actor.role === Role.HR_ADMIN) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { hrDepartmentId: true },
    });
    const isUnscoped =
      !!tenant?.hrDepartmentId && actor.departmentId === tenant.hrDepartmentId;
    logger.debug(`Actor ${actor.id} is HR_ADMIN — unscoped=${isUnscoped}`);
    return isUnscoped;
  }

  return false;
}
