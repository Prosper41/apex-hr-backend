import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { NotifyApprovedCommand } from '../commands/notify-approved.command';
import { LeaveNotificationDispatcher } from '../../leave-notification-dispatcher.service';

@CommandHandler(NotifyApprovedCommand)
export class NotifyApprovedHandler implements ICommandHandler<NotifyApprovedCommand> {
  private readonly logger = new Logger(NotifyApprovedHandler.name);

  constructor(private readonly dispatcher: LeaveNotificationDispatcher) {}

  async execute({ leaveRequestId }: NotifyApprovedCommand) {
    this.logger.debug(
      `Notifying employee of approval -> leaveRequestId=${leaveRequestId}`,
    );
    const leaveRequest =
      await this.dispatcher.fetchLeaveRequest(leaveRequestId);
    if (!leaveRequest) return;

    await this.dispatcher.notifyEmployee(leaveRequest, 'approved');
  }
}
