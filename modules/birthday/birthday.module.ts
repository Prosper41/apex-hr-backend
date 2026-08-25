import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infra/database/prisma/prisma.module';
import { SendBirthdayNotificationsHandler } from './handlers/send-birthday-notifications.handler';
import { GetUpcomingBirthdaysHandler } from './handlers/get-upcoming-birthdays.handler';

export const BirthdayCommandHandlers = [SendBirthdayNotificationsHandler];
export const BirthdayQueryHandlers = [GetUpcomingBirthdaysHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  providers: [...BirthdayCommandHandlers, ...BirthdayQueryHandlers],
  exports: [...BirthdayCommandHandlers, ...BirthdayQueryHandlers],
})
export class BirthdayModule {}
