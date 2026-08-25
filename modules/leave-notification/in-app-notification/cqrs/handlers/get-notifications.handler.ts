import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetNotificationsQuery } from '../queries/get-notifications.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { NotificationPriority } from '@prisma/client';

@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler implements IQueryHandler<GetNotificationsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ tenantId, userId, filter }: GetNotificationsQuery) {
    const where = {
      tenantId,
      userId,
      ...(filter === 'unread' ? { isRead: false } : {}),
      ...(filter === 'high-priority'
        ? { priority: NotificationPriority.HIGH }
        : {}),
    };

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
