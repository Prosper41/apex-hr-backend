import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { NotifySubmittedCommand } from '../commands/notify-submitted.command';
import { LeaveNotificationDispatcher } from '../../leave-notification-dispatcher.service';

@CommandHandler(NotifySubmittedCommand)
export class NotifySubmittedHandler implements ICommandHandler<NotifySubmittedCommand> {
  private readonly logger = new Logger(NotifySubmittedHandler.name);

  constructor(private readonly dispatcher: LeaveNotificationDispatcher) {}

  async execute({
    leaveRequestId,
    tenantId,
    departmentId,
  }: NotifySubmittedCommand) {
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

    // ── Confirm to the requester that their submission went through ───────
    await this.dispatcher.notifyEmployee(
      leaveRequest,
      'submitted successfully',
    );

    const recipients = await this.dispatcher.findRecipients({
      tenantId,
      departmentId,
      role: 'TEAM_LEAD',
    });

    this.logger.debug(
      `Notifying TEAM_LEAD -> leaveRequestId=${leaveRequestId}, departmentId=${departmentId}, recipientCount=${recipients.length}`,
    );

    await this.dispatcher.notifyAll(
      recipients,
      leaveRequest,
      'submitted and is awaiting your comment',
    );

    this.logger.debug(`Completed -> leaveRequestId=${leaveRequestId}`);
  }
}
