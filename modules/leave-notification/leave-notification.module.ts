import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullMQConfigModule } from '@infra/queue/bull_module';
import { MailModule } from '@infra/mail/mail.module';

import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveNotificationDispatcher } from './leave-notification-dispatcher.service';
import { NotifySubmittedHandler } from './cqrs/handlers/notify-submitted.handler';
import { NotifyTeamLeadCommentedHandler } from './cqrs/handlers/notify-team-lead-commented.handler';
import { NotifyDeptApprovedHandler } from './cqrs/handlers/notify-dept-approved.handler';
import { NotificationCoreModule } from './in-app-notification/notification-core.module';
import { NotifyApprovedHandler } from './cqrs/handlers/notify-approved.handler';
import { NotifyCancelledHandler } from './cqrs/handlers/notify-cancelled.handler';
import { NotifyRejectedHandler } from './cqrs/handlers/notify-rejected.handler';

export const NotificationCommandHandlers = [
  NotifySubmittedHandler,
  NotifyTeamLeadCommentedHandler,
  NotifyDeptApprovedHandler,
  NotifyApprovedHandler,
  NotifyCancelledHandler,
  NotifyRejectedHandler,
];

@Module({
  imports: [CqrsModule, BullMQConfigModule, MailModule, NotificationCoreModule],
  providers: [
    PrismaService,
    LeaveNotificationDispatcher,
    ...NotificationCommandHandlers,
  ],
})
export class LeaveNotificationModule {}
