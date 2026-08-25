// notification.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationCoreModule } from './notification-core.module';
import { NotificationController } from './notification.controller';
import { GetNotificationsHandler } from './cqrs/handlers/get-notifications.handler';
import { GetNotificationStatsHandler } from './cqrs/handlers/get-notification-stats.handler';
import { MarkNotificationReadHandler } from './cqrs/handlers/mark-notification-read.handler';
import { MarkAllNotificationsReadHandler } from './cqrs/handlers/mark-all-notifications-read.handler';

export const NotificationQueryHandlers = [
  GetNotificationsHandler,
  GetNotificationStatsHandler,
];

export const NotificationCommandHandlers = [
  MarkNotificationReadHandler,
  MarkAllNotificationsReadHandler,
];

@Module({
  imports: [CqrsModule, NotificationCoreModule],
  controllers: [NotificationController],
  providers: [...NotificationQueryHandlers, ...NotificationCommandHandlers],
  exports: [],
})
export class NotificationModule {}
