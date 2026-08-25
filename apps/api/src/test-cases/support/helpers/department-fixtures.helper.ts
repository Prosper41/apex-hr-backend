import { PrismaService } from '@infra/database/prisma/prisma.service';

/**
 * Creates a department directly via Prisma rather than through the
 * department module's own API. Auth-module tests only need a valid
 * departmentId to satisfy RegisterDto — they are not responsible for
 * verifying department-creation behavior itself (that belongs to the
 * department module's own spec files).
 */
export async function createDepartmentFixture(
  prisma: PrismaService,
  tenantId: string,
  name = 'Sales',
) {
  return prisma.department.create({ data: { name, tenantId } });
}

/**
 * Creates a department AND designates it as the tenant's HR Department
 * (Tenant.hrDepartmentId), exactly as step 2 of your Initial Setup
 * describes. Done directly via Prisma rather than the
 * `isHrDepartment` flag on the department-create API, since that flag
 * currently has no guard against a tenant ending up with more than one
 * HR department (see department module review notes) — fixtures should
 * not depend on that unreviewed path.
 */
export async function createHrDepartmentFixture(
  prisma: PrismaService,
  tenantId: string,
  name = 'HR',
) {
  const department = await prisma.department.create({
    data: { name, tenantId },
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { hrDepartmentId: department.id },
  });

  return department;
}
