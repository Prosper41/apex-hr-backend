import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  LeaveNotificationJobType,
  LeaveRequestNotificationJobData,
} from 'modules/leave-notification/jobs/leave-request-notification.job';
import { NotifySubmittedCommand } from 'modules/leave-notification/cqrs/commands/notify-submitted.command';
import { NotifyTeamLeadCommentedCommand } from 'modules/leave-notification/cqrs/commands/notify-team-lead-commented.command';
import { NotifyDeptApprovedCommand } from 'modules/leave-notification/cqrs/commands/notify-dept-approved.command';
import { NotifyApprovedCommand } from 'modules/leave-notification/cqrs/commands/notify-approved.command';
import { NotifyRejectedCommand } from 'modules/leave-notification/cqrs/commands/notify-rejected.command';
import { NotifyCancelledCommand } from 'modules/leave-notification/cqrs/commands/notify-cancelled.command';

@Processor('leave-requests', { concurrency: 5 })
export class LeaveRequestNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaveRequestNotificationProcessor.name);

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async process(job: Job<LeaveRequestNotificationJobData>) {
    const { type, leaveRequestId, tenantId, departmentId } = job.data;

    this.logger.debug(
      `Processing job -> id=${job.id}, name=${job.name}, type=${type}, attempt=${job.attemptsMade + 1}/${job.opts.attempts}`,
    );

    try {
      let result;

      switch (type) {
        case LeaveNotificationJobType.SUBMITTED:
          result = await this.commandBus.execute(
            new NotifySubmittedCommand(leaveRequestId, tenantId, departmentId),
          );
          break;
        case LeaveNotificationJobType.TEAM_LEAD_COMMENTED:
          result = await this.commandBus.execute(
            new NotifyTeamLeadCommentedCommand(
              leaveRequestId,
              tenantId,
              departmentId,
            ),
          );
          break;
        case LeaveNotificationJobType.DEPT_APPROVED:
          result = await this.commandBus.execute(
            new NotifyDeptApprovedCommand(
              leaveRequestId,
              tenantId,
              departmentId,
            ),
          );
          break;
        case LeaveNotificationJobType.APPROVED:
          result = await this.commandBus.execute(
            new NotifyApprovedCommand(leaveRequestId, tenantId),
          );
          break;
        case LeaveNotificationJobType.REJECTED:
          result = await this.commandBus.execute(
            new NotifyRejectedCommand(leaveRequestId, tenantId),
          );
          break;
        case LeaveNotificationJobType.CANCELLED:
          result = await this.commandBus.execute(
            new NotifyCancelledCommand(leaveRequestId, tenantId),
          );
          break;
        default:
          this.logger.warn(
            `No handler implemented for job type "${type}" -> jobId=${job.id}`,
          );
          return;
      }

      this.logger.debug(`Job handler resolved -> id=${job.id}, type=${type}`);
      return result;
    } catch (err) {
      this.logger.error(
        `Job handler threw -> id=${job.id}, type=${type}, leaveRequestId=${leaveRequestId}, attempt=${job.attemptsMade + 1}/${job.opts.attempts}, error=${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job started -> id=${job.id}, name=${job.name}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job completed -> id=${job.id}, name=${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(
      `Job failed -> id=${job.id}, name=${job.name}, attemptsMade=${job.attemptsMade}, reason=${job.failedReason}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job stalled -> id=${jobId}`);
  }

  @OnWorkerEvent('error')
  onError(err: Error) {
    this.logger.error(`Worker-level error: ${err.message}`, err.stack);
  }
}
