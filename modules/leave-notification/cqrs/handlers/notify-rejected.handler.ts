import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

import { NotifyRejectedCommand } from '../commands/notify-rejected.command';
import { LeaveNotificationDispatcher } from '../../leave-notification-dispatcher.service';

@CommandHandler(NotifyRejectedCommand)
export class NotifyRejectedHandler implements ICommandHandler<NotifyRejectedCommand> {
  private readonly logger = new Logger(NotifyRejectedHandler.name);

  constructor(private readonly dispatcher: LeaveNotificationDispatcher) {}

  async execute({ leaveRequestId }: NotifyRejectedCommand): Promise<void> {
    this.logger.debug(
      `Notifying employee of rejection -> leaveRequestId=${leaveRequestId}`,
    );

    const leaveRequest =
      await this.dispatcher.fetchLeaveRequest(leaveRequestId);

    if (!leaveRequest) {
      this.logger.warn(
        `Leave request not found -> leaveRequestId=${leaveRequestId}`,
      );
      return;
    }

    await this.dispatcher.notifyEmployee(leaveRequest, 'rejected');

    this.logger.debug(
      `Employee notified of rejection -> leaveRequestId=${leaveRequestId}`,
    );
  }
}
