import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveRequestStatus } from '@prisma/client';
import { GetDashboardStatsQuery } from '../queries/get-dashboard-stats.query';
import { DashboardStatsResponseDto } from '../dto/dashboard-stats-response.dto';
import { TenantConflictScanService } from '../tenant-conflict-scan.service';

@QueryHandler(GetDashboardStatsQuery)
export class GetDashboardStatsHandler implements IQueryHandler<GetDashboardStatsQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantConflictScanService: TenantConflictScanService,
  ) {}

  async execute(
    query: GetDashboardStatsQuery,
  ): Promise<DashboardStatsResponseDto> {
    const { tenantId } = query;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      1,
    );

    const sevenDaysOut = new Date(startOfToday);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

    const [pendingRequests, approvedMTD, outTodayRows, totalStaff, conflicts] =
      await Promise.all([
        this.prisma.leaveRequest.count({
          where: {
            tenantId,
            status: {
              in: [
                LeaveRequestStatus.PENDING,
                LeaveRequestStatus.TEAM_LEAD_COMMENTED,
                LeaveRequestStatus.DEPT_APPROVED,
              ],
            },
          },
        }),
        this.prisma.leaveRequest.count({
          where: {
            tenantId,
            status: LeaveRequestStatus.APPROVED,
            updatedAt: { gte: startOfMonth },
          },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            tenantId,
            status: LeaveRequestStatus.APPROVED,
            startDate: { lte: endOfToday },
            endDate: { gte: startOfToday },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.user.count({ where: { tenantId } }),
        this.tenantConflictScanService.countConflictingDepartments(
          tenantId,
          startOfToday,
          sevenDaysOut,
        ),
      ]);

    return {
      pendingRequests,
      approvedMTD,
      outToday: outTodayRows.length,
      totalStaff,
      conflicts,
    };
  }
}
