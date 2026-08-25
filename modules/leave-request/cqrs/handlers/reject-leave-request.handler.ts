import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { LeaveRequestStatus, Role } from '@prisma/client';
import { RejectLeaveRequestCommand } from '../commands/reject-leave-request.command';
import { LeaveApprovalRoutingService } from 'modules/leave-request/services/leave-approval-routing.service'; 
import { LeaveReviewAuthorizationService } from 'modules/leave-request/services/leave-review-authorization.service';
import { LeaveBalanceService } from '../../services/leave-balance.service';
import {
  LeaveNotificationJobType,
  LeaveRequestNotificationJobData,
} from 'modules/leave-notification/jobs/leave-request-notification.job';

const REJECTABLE_STAGES: LeaveRequestStatus[] = [
  LeaveRequestStatus.TEAM_LEAD_COMMENTED,
  LeaveRequestStatus.DEPT_APPROVED,
];

const STAMP_FIELD: Record<string, [string, string]> = {
  [Role.DEPT_HEAD]: ['deptApproverId', 'deptApprovedAt'],
  [Role.HR_ADMIN]: ['hrApproverId', 'hrApprovedAt'],
  [Role.TENANT_ADMIN]: ['tenantAdminApproverId', 'tenantAdminApprovedAt'],
};

@CommandHandler(RejectLeaveRequestCommand)
export class RejectLeaveRequestHandler implements ICommandHandler<RejectLeaveRequestCommand> {
  private readonly logger = new Logger(RejectLeaveRequestHandler.name);

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
    reason,
  }: RejectLeaveRequestCommand) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
      include: { user: { select: { role: true } } },
    });
    if (!leaveRequest) throw new NotFoundException('Leave request not found');
    if (!REJECTABLE_STAGES.includes(leaveRequest.status)) {
      throw new BadRequestException(
        `Leave request is ${leaveRequest.status} and cannot be rejected`,
      );
    }

    const requiredRole = this.routing.requiredRoleForStage(
      leaveRequest.status,
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
          status: LeaveRequestStatus.REJECTED,
          [approverField]: actorId,
          [approvedAtField]: new Date(),
        },
      });
      if (reason)
        await tx.leaveRequestComment.create({
          data: { leaveRequestId, authorId: actorId, comment: reason },
        });
      await this.balance.release(tx, leaveRequestId);
      return result;
    });

    const jobType = LeaveNotificationJobType.REJECTED;
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
      `${requiredRole} ${actorId} rejected leave request ${leaveRequestId}`,
    );
    return updated;
  }
}
