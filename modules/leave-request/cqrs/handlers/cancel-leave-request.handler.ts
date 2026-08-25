import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { LeaveRequestStatus } from '@prisma/client';
import { CancelLeaveRequestCommand } from '../commands/cancel-leave-request.command';
import { LeaveApprovalRoutingService } from 'modules/leave-request/services/leave-approval-routing.service'; 
import {
  LeaveNotificationJobType,
  LeaveRequestNotificationJobData,
} from 'modules/leave-notification/jobs/leave-request-notification.job';
import { LeaveBalanceService } from '../../services/leave-balance.service';

@CommandHandler(CancelLeaveRequestCommand)
export class CancelLeaveRequestHandler implements ICommandHandler<CancelLeaveRequestCommand> {
  private readonly logger = new Logger(CancelLeaveRequestHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: LeaveApprovalRoutingService,
    private readonly balance: LeaveBalanceService,
    @InjectQueue('leave-requests')
    private readonly queue: Queue<LeaveRequestNotificationJobData>,
  ) {}

  async execute({
    leaveRequestId,
    tenantId,
    requesterId,
  }: CancelLeaveRequestCommand) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
    });
    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    if (leaveRequest.userId !== requesterId) {
      this.logger.warn(
        `User ${requesterId} attempted to cancel a request they don't own (${leaveRequestId})`,
      );
      throw new ForbiddenException(
        'You can only cancel your own leave requests',
      );
    }

    if (!this.routing.isCancellable(leaveRequest.status)) {
      throw new BadRequestException(
        `Leave request is already ${leaveRequest.status} and cannot be cancelled`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { status: LeaveRequestStatus.CANCELLED },
      });
      await this.balance.release(tx, leaveRequestId);
      return result;
    });

    const jobType = LeaveNotificationJobType.CANCELLED;
    await this.queue.add(
      jobType,
      {
        type: jobType,
        leaveRequestId,
        tenantId,
        departmentId: updated.departmentId,
      },
      { jobId: `${jobType}-${leaveRequestId}` },
    );

    this.logger.log(
      `Leave request ${leaveRequestId} cancelled by owner ${requesterId}`,
    );
    return updated;
  }
}
