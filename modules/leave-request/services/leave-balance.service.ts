import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma, EntryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LeaveBalanceService {
  private readonly logger = new Logger(LeaveBalanceService.name);

  async getUsableBalance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    employeeId: string,
    leavePolicyId: string,
  ): Promise<number> {
    const result = await tx.leaveBalanceLedger.aggregate({
      _sum: { amount: true },
      where: {
        tenantId,
        employeeId,
        leavePolicyId,
        isPending: false,
        effectiveDate: { lte: new Date() },
      },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async reserve(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      employeeId: string;
      leavePolicyId: string;
      totalDays: number;
      effectiveDate: Date;
      leaveRequestId: string;
    },
  ) {
    const usable = await this.getUsableBalance(
      tx,
      params.tenantId,
      params.employeeId,
      params.leavePolicyId,
    );
    this.logger.debug(
      `usable=${usable}, requested=${params.totalDays}, employee=${params.employeeId}`,
    );
    if (usable < params.totalDays) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${usable} day(s), Requested: ${params.totalDays} day(s)`,
      );
    }
    await tx.leaveBalanceLedger.create({
      data: {
        tenantId: params.tenantId,
        employeeId: params.employeeId,
        leavePolicyId: params.leavePolicyId,
        entryType: EntryType.DEDUCTION,
        amount: new Decimal(-params.totalDays),
        isPending: true,
        effectiveDate: params.effectiveDate,
        referenceId: params.leaveRequestId,
        note: 'Leave request submitted — awaiting approval',
      },
    });
  }

  async confirm(tx: Prisma.TransactionClient, leaveRequestId: string) {
    const { count } = await tx.leaveBalanceLedger.updateMany({
      where: { referenceId: leaveRequestId, isPending: true },
      data: { isPending: false },
    });
    this.logger.debug(
      `Confirmed ${count} ledger entrie(s) for leaveRequestId=${leaveRequestId}`,
    );
  }

  async release(tx: Prisma.TransactionClient, leaveRequestId: string) {
    const { count } = await tx.leaveBalanceLedger.deleteMany({
      where: { referenceId: leaveRequestId, isPending: true },
    });
    this.logger.debug(
      `Released ${count} pending ledger entrie(s) for leaveRequestId=${leaveRequestId}`,
    );
  }
}