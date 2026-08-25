import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { NotificationPriority, NotificationSourceType } from '@prisma/client';

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  sourceType: NotificationSourceType;
  sourceId?: string;
  priority?: NotificationPriority;
}

@Injectable()
export class CreateNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        title: input.title,
        message: input.message,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        priority: input.priority ?? NotificationPriority.LOW,
      },
    });
  }
}
