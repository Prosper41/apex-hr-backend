import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveType, AccrualFrequency, CarryOverPolicy } from '@prisma/client';

/**
 * Creates a leave policy directly via Prisma. The leave-policy module's own
 * CRUD flow is out of scope here — leave-request tests only need a valid,
 * active policy to submit requests against.
 *
 * Note: SubmitLeaveRequestHandler currently validates a policy only by
 * `{ id, tenantId, isActive }` — it does NOT check LeavePolicyDepartment
 * linkage. This fixture intentionally does not create that linkage row by
 * default, mirroring the gap so the routing spec can test it directly.
 */
export async function createLeavePolicyFixture(
  prisma: PrismaService,
  tenantId: string,
  overrides: Partial<{
    name: string;
    type: LeaveType;
    maxBalance: number;
    isActive: boolean;
  }> = {},
) {
  return prisma.leavePolicy.create({
    data: {
      name: overrides.name ?? 'Annual Leave',
      type: overrides.type ?? LeaveType.Annual,
      accrual: AccrualFrequency.Monthly,
      accrualRate: 1.5,
      maxBalance: overrides.maxBalance ?? 30,
      carryOverPolicy: CarryOverPolicy.None,
      isActive: overrides.isActive ?? true,
      tenantId,
    },
  });
}
