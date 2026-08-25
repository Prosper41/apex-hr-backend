import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { DashboardController } from './dashboard.controller';
import { GetDashboardStatsHandler } from './handlers/get-dashboard-stats.handler';
import { TenantConflictScanService } from './tenant-conflict-scan.service';

@Module({
  imports: [CqrsModule],
  controllers: [DashboardController],
  providers: [
    PrismaService,
    TenantConflictScanService,
    GetDashboardStatsHandler,
  ],
})
export class DashboardModule {}
