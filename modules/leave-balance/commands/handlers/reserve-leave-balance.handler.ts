import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { EntryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ReserveLeaveBalanceCommand } from '../reserve-leave-balance.command';

@CommandHandler(ReserveLeaveBalanceCommand)
export class ReserveLeaveBalanceHandler implements ICommandHandler<ReserveLeaveBalanceCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReserveLeaveBalanceCommand): Promise<void> {
    const {
      tenantId,
      employeeId,
      leavePolicyId,
      leaveRequestId,
      days,
      effectiveDate,
    } = command;

    console.log('ReserveLeaveBalance params:', {
      tenantId,
      employeeId,
      leavePolicyId,
      days,
    });

    await this.prisma.$transaction(async (tx) => {
      // Sum ALL non-pending ledger entries for this employee + policy.
      // Credits are stored as positive, debits as negative — SUM gives net balance.
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

      const usable = result._sum.amount?.toNumber() ?? 0;

      if (usable < days) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${usable} day(s), Requested: ${days} day(s)`,
        );
      }

      // Insert pending debit as NEGATIVE to stay consistent with ledger convention.
      await tx.leaveBalanceLedger.create({
        data: {
          tenantId,
          employeeId,
          leavePolicyId,
          entryType: EntryType.DEDUCTION,
          amount: new Decimal(-days),
          isPending: true,
          effectiveDate,
          referenceId: leaveRequestId,
          note: 'Leave request submitted — awaiting approval',
        },
      });
    });
  }
}
