import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { ConfirmLeaveDeductionCommand } from '../confirm-leave-deduction.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(ConfirmLeaveDeductionCommand)
export class ConfirmLeaveDeductionHandler implements ICommandHandler<ConfirmLeaveDeductionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ConfirmLeaveDeductionCommand): Promise<void> {
    const { leaveRequestId } = command;

    const entry = await this.prisma.leaveBalanceLedger.findFirst({
      where: { referenceId: leaveRequestId, isPending: true },
    });

    if (!entry) {
      throw new NotFoundException(
        `No pending balance entry found for leave request ${leaveRequestId}`,
      );
    }

    await this.prisma.leaveBalanceLedger.updateMany({
      where: { referenceId: leaveRequestId, isPending: true },
      data: { isPending: false },
    });
  }
}
