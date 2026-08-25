import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { MarkNotificationReadCommand } from '../commands/mark-notification-read.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<MarkNotificationReadCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    notificationId,
    userId,
    tenantId,
  }: MarkNotificationReadCommand) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
