import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { LeaveRequestStatus, Role } from '@prisma/client';
import { TeamLeadCommentLeaveRequestCommand } from '../commands/team-lead-comment-leave-request.command';
import { LeaveReviewAuthorizationService } from 'modules/leave-request/services/leave-review-authorization.service'; 
import {
  LeaveNotificationJobType,
  LeaveRequestNotificationJobData,
} from 'modules/leave-notification/jobs/leave-request-notification.job';

@CommandHandler(TeamLeadCommentLeaveRequestCommand)
export class TeamLeadCommentLeaveRequestHandler implements ICommandHandler<TeamLeadCommentLeaveRequestCommand> {
  private readonly logger = new Logger(TeamLeadCommentLeaveRequestHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: LeaveReviewAuthorizationService,
    @InjectQueue('leave-requests')
    private readonly queue: Queue<LeaveRequestNotificationJobData>,
  ) {}

  async execute({
    leaveRequestId,
    tenantId,
    actorId,
    comment,
  }: TeamLeadCommentLeaveRequestCommand) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
    });
    if (!leaveRequest) throw new NotFoundException('Leave request not found');
    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Leave request is ${leaveRequest.status}, not awaiting a Team Lead comment`,
      );
    }

    await this.auth.assertCanAct({
      actorId,
      tenantId,
      departmentId: leaveRequest.departmentId,
      requiredRole: Role.TEAM_LEAD,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: LeaveRequestStatus.TEAM_LEAD_COMMENTED,
          teamLeadApproverId: actorId,
          teamLeadApprovedAt: new Date(),
        },
      });
      await tx.leaveRequestComment.create({
        data: { leaveRequestId, authorId: actorId, comment },
      });
      return result;
    });

    const jobType = LeaveNotificationJobType.TEAM_LEAD_COMMENTED;
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
      `Team Lead ${actorId} commented on leave request ${leaveRequestId}`,
    );
    return updated;
  }
}
