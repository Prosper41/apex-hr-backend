import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { NotifyCancelledCommand } from '../commands/notify-cancelled.command';
import { LeaveNotificationDispatcher } from '../../leave-notification-dispatcher.service';

@CommandHandler(NotifyCancelledCommand)
export class NotifyCancelledHandler implements ICommandHandler<NotifyCancelledCommand> {
  private readonly logger = new Logger(NotifyCancelledHandler.name);

  constructor(private readonly dispatcher: LeaveNotificationDispatcher) {}

  async execute({ leaveRequestId }: NotifyCancelledCommand) {
    this.logger.debug(
      `Notifying employee of cancellation -> leaveRequestId=${leaveRequestId}`,
    );
    const leaveRequest =
      await this.dispatcher.fetchLeaveRequest(leaveRequestId);
    if (!leaveRequest) return;

    await this.dispatcher.notifyEmployee(leaveRequest, 'cancelled');
  }
}
