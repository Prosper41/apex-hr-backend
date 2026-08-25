import { Module } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { CreateNotificationService } from './create-notification.service';

@Module({
  providers: [PrismaService, CreateNotificationService],
  exports: [CreateNotificationService],
})
export class NotificationCoreModule {}
