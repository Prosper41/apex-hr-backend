import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkAllNotificationsReadCommand } from '../commands/mark-all-notifications-read.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(MarkAllNotificationsReadCommand)
export class MarkAllNotificationsReadHandler implements ICommandHandler<MarkAllNotificationsReadCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, tenantId }: MarkAllNotificationsReadCommand) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }
}
