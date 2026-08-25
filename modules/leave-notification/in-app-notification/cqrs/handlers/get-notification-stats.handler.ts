import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetNotificationStatsQuery } from '../queries/get-notification-stats.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { NotificationPriority } from '@prisma/client';

@QueryHandler(GetNotificationStatsQuery)
export class GetNotificationStatsHandler implements IQueryHandler<GetNotificationStatsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ tenantId, userId }: GetNotificationStatsQuery) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [total, unread, highPriority, thisWeek] = await Promise.all([
      this.prisma.notification.count({ where: { tenantId, userId } }),
      this.prisma.notification.count({
        where: { tenantId, userId, isRead: false },
      }),
      this.prisma.notification.count({
        where: { tenantId, userId, priority: NotificationPriority.HIGH },
      }),
      this.prisma.notification.count({
        where: { tenantId, userId, createdAt: { gte: startOfWeek } },
      }),
    ]);

    return { total, unread, highPriority, thisWeek };
  }
}
