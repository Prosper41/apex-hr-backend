import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { LeaveRequestStatus, Role } from '@prisma/client';
import { DeptApproveLeaveRequestCommand } from '../commands/dept-approve-leave-request.command';
import { LeaveApprovalRoutingService } from 'modules/leave-request/services/leave-approval-routing.service'; 
import { LeaveReviewAuthorizationService } from 'modules/leave-request/services/leave-review-authorization.service';
import {
  LeaveNotificationJobType,
  LeaveRequestNotificationJobData,
} from 'modules/leave-notification/jobs/leave-request-notification.job';

@CommandHandler(DeptApproveLeaveRequestCommand)
export class DeptApproveLeaveRequestHandler implements ICommandHandler<DeptApproveLeaveRequestCommand> {
  private readonly logger = new Logger(DeptApproveLeaveRequestHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: LeaveApprovalRoutingService,
    private readonly auth: LeaveReviewAuthorizationService,
    @InjectQueue('leave-requests')
    private readonly queue: Queue<LeaveRequestNotificationJobData>,
  ) {}

  async execute({
    leaveRequestId,
    tenantId,
    actorId,
    comment,
  }: DeptApproveLeaveRequestCommand) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
    });
    if (!leaveRequest) throw new NotFoundException('Leave request not found');
    if (leaveRequest.status !== LeaveRequestStatus.TEAM_LEAD_COMMENTED) {
      throw new BadRequestException(
        `Leave request is ${leaveRequest.status}, not awaiting Department Head approval`,
      );
    }

    await this.auth.assertCanAct({
      actorId,
      tenantId,
      departmentId: leaveRequest.departmentId,
      requiredRole: Role.DEPT_HEAD,
    });

    const updated = await this.prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: LeaveRequestStatus.DEPT_APPROVED,
        deptApproverId: actorId,
        deptApprovedAt: new Date(),
        deptComment: comment,
      },
    });

    const jobType = LeaveNotificationJobType.DEPT_APPROVED;
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
      `Dept Head ${actorId} approved leave request ${leaveRequestId}`,
    );
    return updated;
  }
}
