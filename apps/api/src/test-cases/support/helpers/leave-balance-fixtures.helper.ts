import { PrismaService } from '@infra/database/prisma/prisma.service';
import { EntryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Grants usable leave balance to an employee by writing a settled ACCRUAL
 * ledger entry directly via Prisma.
 *
 * This mirrors exactly what SubmitLeaveRequestHandler reads: it sums all
 * non-pending ledger entries with effectiveDate <= now for
 * (tenantId, employeeId, leavePolicyId) to compute usable balance. Setting
 * effectiveDate to yesterday guarantees it is always in the past relative
 * to "now" at submission time, regardless of test execution speed.
 */
export async function grantLeaveBalanceFixture(
  prisma: PrismaService,
  params: {
    tenantId: string;
    employeeId: string;
    leavePolicyId: string;
    amount?: number;
  },
) {
  return prisma.leaveBalanceLedger.create({
    data: {
      tenantId: params.tenantId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
      entryType: EntryType.ACCRUAL,
      amount: new Decimal(params.amount ?? 20),
      isPending: false,
      effectiveDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      note: 'Test fixture grant',
    },
  });
}
