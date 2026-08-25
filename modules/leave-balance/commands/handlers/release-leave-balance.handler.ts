import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { ReleaseLeaveBalanceCommand } from '../release-leave-balance.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(ReleaseLeaveBalanceCommand)
export class ReleaseLeaveBalanceHandler implements ICommandHandler<ReleaseLeaveBalanceCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReleaseLeaveBalanceCommand): Promise<void> {
    const { leaveRequestId } = command;

    const entry = await this.prisma.leaveBalanceLedger.findFirst({
      where: { referenceId: leaveRequestId, isPending: true },
    });

    if (!entry) {
      throw new NotFoundException(
        `No pending balance entry found for leave request ${leaveRequestId}`,
      );
    }

    // Remove the pending reservation entirely — the reserved days are returned
    await this.prisma.leaveBalanceLedger.deleteMany({
      where: { referenceId: leaveRequestId, isPending: true },
    });
  }
}
