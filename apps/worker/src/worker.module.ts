import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@infra/database/prisma/prisma.module';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';

import { LeaveNotificationModule } from 'modules/leave-notification/leave-notification.module';
import { BirthdayModule } from 'modules/birthday/birthday.module';

import { LeaveAccrualScheduler } from './leave-accrual.scheduler';
import { BirthdayNotificationScheduler } from './birthday-notification.scheduler';
import { LeaveRequestNotificationProcessor } from './leave-request-notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    LeaveNotificationModule,
    BirthdayModule,
  ],
  controllers: [WorkerController],
  providers: [
    WorkerService,
    LeaveAccrualScheduler,
    BirthdayNotificationScheduler,
    LeaveRequestNotificationProcessor,
  ],
})
export class WorkerModule {}
