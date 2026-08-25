import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SendBirthdayNotificationsCommand } from '../commands/send-birthday-notifications.command';
import { GetUpcomingBirthdaysQuery } from '../queries/get-upcoming-birthdays.query';
import { UpcomingBirthdayUser } from './get-upcoming-birthdays.handler';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { NotificationPriority, NotificationSourceType } from '@prisma/client';

@CommandHandler(SendBirthdayNotificationsCommand)
export class SendBirthdayNotificationsHandler implements ICommandHandler<SendBirthdayNotificationsCommand> {
  private readonly logger = new Logger(SendBirthdayNotificationsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({ tenantId }: SendBirthdayNotificationsCommand) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Fetch upcoming birthday users via query

    const upcomingBirthdays: UpcomingBirthdayUser[] =
      await this.queryBus.execute(
        new GetUpcomingBirthdaysQuery(tenantId, today, 7),
      );

    if (upcomingBirthdays.length === 0) {
      // this.logger.debug(`No upcoming birthdays for tenantId=${tenantId}`);
      return { notified: 0 };
    }

    // Fetch all recipients in this tenant
    const recipients = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });

    let totalNotified = 0;

    for (const birthdayUser of upcomingBirthdays) {
      const title = birthdayUser.isToday
        ? `🎂 Today is ${birthdayUser.firstName} ${birthdayUser.lastName}'s Birthday!`
        : `🎂 Upcoming Birthday — ${birthdayUser.firstName} ${birthdayUser.lastName}`;

      const message = birthdayUser.isToday
        ? `Today is ${birthdayUser.firstName} ${birthdayUser.lastName}'s birthday. Wish them a happy birthday!`
        : `${birthdayUser.firstName} ${birthdayUser.lastName}'s birthday is in ${birthdayUser.daysUntil} day${birthdayUser.daysUntil === 1 ? '' : 's'}.`;

      const priority = birthdayUser.isToday
        ? NotificationPriority.HIGH
        : NotificationPriority.LOW;

      // Unique key per birthday user per day — prevents duplicates
      const sourceId = `birthday:${birthdayUser.id}-${todayStr}`;

      for (const recipient of recipients) {
        // Don't notify the birthday person about their own birthday
        if (recipient.id === birthdayUser.id) continue;

        try {
          // Check if notification already sent today
          const alreadySent = await this.prisma.notification.findFirst({
            where: { tenantId, userId: recipient.id, sourceId },
          });

          if (alreadySent) continue;

          await this.prisma.notification.create({
            data: {
              tenantId,
              userId: recipient.id,
              title,
              message,
              sourceType: NotificationSourceType.SYSTEM,
              sourceId,
              priority,
            },
          });

          totalNotified++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed to notify userId=${recipient.id} about birthday of userId=${birthdayUser.id}: ${errorMessage}`,
          );
        }
      }
    }

    this.logger.log(
      `SendBirthdayNotifications complete -> tenantId=${tenantId}, notified=${totalNotified}`,
    );

    return { notified: totalNotified };
  }
}
