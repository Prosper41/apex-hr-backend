import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { SubmitLeaveRequestCommand } from '../commands/submit-leave-request.command';
import { LeaveApprovalRoutingService } from 'modules/leave-request/services/leave-approval-routing.service';
import { LeaveBalanceService } from '../../services/leave-balance.service';
import {
  LeaveNotificationJobType,
  LeaveRequestNotificationJobData,
} from 'modules/leave-notification/jobs/leave-request-notification.job';
import { calculateTotalDays } from '@common/utils/leave-days.util';

@CommandHandler(SubmitLeaveRequestCommand)
export class SubmitLeaveRequestHandler implements ICommandHandler<SubmitLeaveRequestCommand> {
  private readonly logger = new Logger(SubmitLeaveRequestHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: LeaveApprovalRoutingService,
    private readonly balance: LeaveBalanceService,
    @InjectQueue('leave-requests')
    private readonly queue: Queue<LeaveRequestNotificationJobData>,
  ) {}

  async execute({ dto, tenantId, userId }: SubmitLeaveRequestCommand) {
    this.logger.log(
      `User ${userId} submitting leave request — policy ${dto.leavePolicyId}, dept ${dto.departmentId}`,
    );

    const policy = await this.prisma.leavePolicy.findFirst({
      where: { id: dto.leavePolicyId, tenantId, isActive: true },
    });
    if (!policy)
      throw new NotFoundException('Leave policy not found or inactive');

    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, tenantId },
    });
    if (!department) throw new NotFoundException('Department not found');
    if (!department.isActive)
      throw new BadRequestException('Department is not active');

    const submitter = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!submitter) throw new NotFoundException('Submitting user not found');
    if (submitter.departmentId !== dto.departmentId) {
      this.logger.warn(
        `User ${userId} (dept ${submitter.departmentId}) tried to submit for dept ${dto.departmentId}`,
      );
      throw new BadRequestException(
        'You can only submit leave requests for your own department',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate)
      throw new BadRequestException('End date cannot be before start date');
    const totalDays = dto.isHalfDay
      ? 0.5
      : calculateTotalDays(startDate, endDate);

    const { status, stamps } = this.routing.resolveInitialRouting(
      userId,
      submitter.role,
    );
    this.logger.debug(
      `Routing resolved: status=${status} for role=${submitter.role}`,
    );

    const leaveRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leaveRequest.create({
        data: {
          userId,
          tenantId,
          leavePolicyId: dto.leavePolicyId,
          departmentId: dto.departmentId,
          startDate,
          endDate,
          totalDays,
          reason: dto.reason,
          status,
          ...stamps,
        },
      });
      await this.balance.reserve(tx, {
        tenantId,
        employeeId: userId,
        leavePolicyId: dto.leavePolicyId,
        totalDays,
        effectiveDate: startDate,
        leaveRequestId: created.id,
      });
      return created;
    });

    await this.queueStageNotification(
      leaveRequest.id,
      tenantId,
      dto.departmentId,
      status,
    );

    this.logger.log(
      `Leave request ${leaveRequest.id} created — status=${status}`,
    );
    return { leaveRequest };
  }

  private async queueStageNotification(
    leaveRequestId: string,
    tenantId: string,
    departmentId: string,
    status: string,
  ) {
    const jobTypeByStatus: Record<string, LeaveNotificationJobType> = {
      PENDING: LeaveNotificationJobType.SUBMITTED,
      TEAM_LEAD_COMMENTED: LeaveNotificationJobType.TEAM_LEAD_COMMENTED,
      DEPT_APPROVED: LeaveNotificationJobType.DEPT_APPROVED,
    };
    const jobType = jobTypeByStatus[status];
    if (!jobType)
      return this.logger.warn(
        `No notification job mapped for status ${status}`,
      );
    await this.queue.add(
      jobType,
      {
        type: jobType,
        leaveRequestId,
        tenantId,
        departmentId,
      },
      { jobId: `${jobType}-${leaveRequestId}` },
    );
    this.logger.debug(
      `Queued ${jobType} notification for leaveRequestId=${leaveRequestId}`,
    );
  }
}
