import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { SendBirthdayNotificationsCommand } from 'modules/birthday/commands/send-birthday-notifications.command';

@Injectable()
export class BirthdayNotificationScheduler {
  private readonly logger = new Logger(BirthdayNotificationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @Cron(CronExpression.EVERY_10_SECONDS)
  async run() {
    // this.logger.log('Birthday notification scheduler started...');

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.commandBus.execute(
        new SendBirthdayNotificationsCommand(tenant.id),
      );
    }

    // this.logger.log(
    //   `Birthday scheduler complete. Processed ${tenants.length} tenant(s).`,
    // );
  }
}
