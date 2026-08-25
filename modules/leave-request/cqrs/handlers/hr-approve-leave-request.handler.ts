import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { LeaveRequestStatus, Role } from '@prisma/client';
import { HrApproveLeaveRequestCommand } from '../commands/hr-approve-leave-request.command';
import { LeaveApprovalRoutingService } from 'modules/leave-request/services/leave-approval-routing.service'; 
import { LeaveReviewAuthorizationService } from 'modules/leave-request/services/leave-review-authorization.service';
import { LeaveBalanceService } from '../../services/leave-balance.service';
import {
  LeaveNotificationJobType,
  LeaveRequestNotificationJobData,
} from 'modules/leave-notification/jobs/leave-request-notification.job';

const STAMP_FIELD: Record<string, [string, string]> = {
  [Role.HR_ADMIN]: ['hrApproverId', 'hrApprovedAt'],
  [Role.TENANT_ADMIN]: ['tenantAdminApproverId', 'tenantAdminApprovedAt'],
};

@CommandHandler(HrApproveLeaveRequestCommand)
export class HrApproveLeaveRequestHandler implements ICommandHandler<HrApproveLeaveRequestCommand> {
  private readonly logger = new Logger(HrApproveLeaveRequestHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: LeaveApprovalRoutingService,
    private readonly auth: LeaveReviewAuthorizationService,
    private readonly balance: LeaveBalanceService,
    @InjectQueue('leave-requests')
    private readonly queue: Queue<LeaveRequestNotificationJobData>,
  ) {}

  async execute({
    leaveRequestId,
    tenantId,
    actorId,
  }: HrApproveLeaveRequestCommand) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
      include: { user: { select: { role: true } } },
    });
    if (!leaveRequest) throw new NotFoundException('Leave request not found');
    if (leaveRequest.status !== LeaveRequestStatus.DEPT_APPROVED) {
      throw new BadRequestException(
        `Leave request is ${leaveRequest.status}, not awaiting final approval`,
      );
    }

    // Only escalates to TENANT_ADMIN when the submitter IS an HR Admin — never a general override.
    const requiredRole = this.routing.resolveFinalApproverRole(
      leaveRequest.user.role,
    );
    await this.auth.assertCanAct({
      actorId,
      tenantId,
      departmentId: leaveRequest.departmentId,
      requiredRole,
    });

    const [approverField, approvedAtField] = STAMP_FIELD[requiredRole];

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: LeaveRequestStatus.APPROVED,
          [approverField]: actorId,
          [approvedAtField]: new Date(),
        },
      });
      await this.balance.confirm(tx, leaveRequestId);
      return result;
    });

    const jobType = LeaveNotificationJobType.APPROVED;
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
      `${requiredRole} ${actorId} gave final approval on leave request ${leaveRequestId}`,
    );
    return updated;
  }
}
