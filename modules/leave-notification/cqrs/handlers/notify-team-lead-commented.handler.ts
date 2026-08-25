import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { NotifyTeamLeadCommentedCommand } from '../commands/notify-team-lead-commented.command';
import { LeaveNotificationDispatcher } from '../../leave-notification-dispatcher.service';

@CommandHandler(NotifyTeamLeadCommentedCommand)
export class NotifyTeamLeadCommentedHandler implements ICommandHandler<NotifyTeamLeadCommentedCommand> {
  private readonly logger = new Logger(NotifyTeamLeadCommentedHandler.name);

  constructor(private readonly dispatcher: LeaveNotificationDispatcher) {}

  async execute({
    leaveRequestId,
    tenantId,
    departmentId,
  }: NotifyTeamLeadCommentedCommand) {
    this.logger.debug(
      `Executing -> leaveRequestId=${leaveRequestId}, tenantId=${tenantId}, departmentId=${departmentId}`,
    );

    const leaveRequest =
      await this.dispatcher.fetchLeaveRequest(leaveRequestId);

    if (!leaveRequest) {
      this.logger.warn(
        `Aborting -> leaveRequestId=${leaveRequestId} not found, no notification sent`,
      );
      return;
    }

    const recipients = await this.dispatcher.findRecipients({
      tenantId,
      departmentId,
      role: 'DEPT_HEAD',
    });

    this.logger.debug(
      `Notifying DEPT_HEAD -> leaveRequestId=${leaveRequestId}, departmentId=${departmentId}, recipientCount=${recipients.length}`,
    );

    await this.dispatcher.notifyAll(
      recipients,
      leaveRequest,
      'commented on by the Team Lead and is awaiting your approval',
    );

    this.logger.debug(`Completed -> leaveRequestId=${leaveRequestId}`);
  }
}
