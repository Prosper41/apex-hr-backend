import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { GetMyLeaveBalancesQuery } from '../get-my-leave-balances.query';

interface LeaveBalanceResult {
  leaveType: string;
  policyMax: number;
  accrued: number;
  used: number;
  pending: number;
  remaining: number;
}

@QueryHandler(GetMyLeaveBalancesQuery)
export class GetMyLeaveBalancesHandler implements IQueryHandler<GetMyLeaveBalancesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMyLeaveBalancesQuery): Promise<LeaveBalanceResult[]> {
    const { employeeId, tenantId } = query;

    const policies = await this.prisma.leavePolicy.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, type: true, maxBalance: true },
    });

    const results: LeaveBalanceResult[] = [];

    for (const policy of policies) {
      // Sum only positive (credit) entries — accruals and adjustments
      // effectiveDate filter kept here: future accruals don't count yet
      const accrued = await this.prisma.leaveBalanceLedger.aggregate({
        _sum: { amount: true },
        where: {
          tenantId,
          employeeId,
          leavePolicyId: policy.id,
          isPending: false,
          amount: { gt: 0 },
          effectiveDate: { lte: new Date() },
        },
      });

      // Sum confirmed debit entries — no effectiveDate filter
      // Future-dated leaves (e.g. approved for next month) still consume balance now
      const deducted = await this.prisma.leaveBalanceLedger.aggregate({
        _sum: { amount: true },
        where: {
          tenantId,
          employeeId,
          leavePolicyId: policy.id,
          isPending: false,
          amount: { lt: 0 },
        },
      });

      // Sum pending debit entries — submitted but not yet HR-approved
      const pendingDeductions = await this.prisma.leaveBalanceLedger.aggregate({
        _sum: { amount: true },
        where: {
          tenantId,
          employeeId,
          leavePolicyId: policy.id,
          isPending: true,
          amount: { lt: 0 },
        },
      });

      const totalAccrued = accrued._sum.amount?.toNumber() ?? 0;
      const totalUsed = Math.abs(deducted._sum.amount?.toNumber() ?? 0);
      const totalPending = Math.abs(
        pendingDeductions._sum.amount?.toNumber() ?? 0,
      );
      const remaining = Math.max(totalAccrued - totalUsed - totalPending, 0);

      results.push({
        leaveType: policy.type,
        policyMax: policy.maxBalance,
        accrued: totalAccrued,
        used: totalUsed,
        pending: totalPending,
        remaining,
      });
    }

    return results;
  }
}
