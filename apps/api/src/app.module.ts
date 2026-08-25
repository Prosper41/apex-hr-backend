import { DashboardModule } from 'modules/dashboard/dashboard-conflict cards/dashboard.module';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from 'modules/auth/auth.module';
import { AuditModule } from 'modules/audit/audit.module';
import { CalendarModule } from 'modules/calendar/calendar.module';
import { DepartmentModule } from 'modules/department/department.module';
import { LeaveBalanceModule } from 'modules/leave-balance/leave-balance.module';
import { LeaveNotificationModule } from 'modules/leave-notification/leave-notification.module';
import { LeaveRequestModule } from 'modules/leave-request/leave-request.module';
import { LeavePolicyModule } from 'modules/LeaveTypeConfiguration/leave-policy/leave-policy.module';
import { TenantModule } from 'modules/tenant/tenant.module';
import { UsersModule } from 'modules/users/users.module';
import { SentryTunnelModule } from 'modules/sentry-tunnel/sentry-tunnel.module';

import { BullMQConfigModule } from '@infra/queue/bull_module';
import { RedisModule } from '@infra/cache/redis.module';
import { MailModule } from '@infra/mail/mail.module';

import { RequestTrendsModule } from 'modules/dashboard/request-trends/request-trends.module';
import { DepartmentTodayModule } from 'modules/dashboard/department-today/department-today.module';
import { UpcomingAbsencesModule } from 'modules/dashboard/upcoming-absences/upcoming-absences.module';
@Module({
  imports: [
    SentryModule.forRoot(), // <-- registers Sentry's tracing interceptor globally
    CqrsModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    RedisModule,
    BullMQConfigModule,
    MailModule,

    TenantModule,
    AuthModule,
    UsersModule,
    DepartmentModule,
    LeavePolicyModule,
    LeaveRequestModule,
    LeaveBalanceModule,
    LeaveNotificationModule,
    AuditModule,
    CalendarModule,
    SentryTunnelModule,
    DashboardModule,
    RequestTrendsModule,
    DepartmentTodayModule,
    UpcomingAbsencesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
