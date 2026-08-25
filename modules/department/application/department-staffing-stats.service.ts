import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service'; 
import { LeaveRequestStatus } from '@prisma/client';

@Injectable()
export class DepartmentStaffingStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(params: {
    tenantId: string;
    scopeFilter: { departmentId?: string };
    startOfToday: Date;
    endOfToday: Date;
  }) {
    const { tenantId, scopeFilter, startOfToday, endOfToday } = params;
    const activeUserFilter = { tenantId, ...scopeFilter, offboardedAt: null };

    const [totalEmployees, onLeaveRows] = await Promise.all([
      this.prisma.user.count({ where: activeUserFilter }),
      this.prisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: LeaveRequestStatus.APPROVED,
          startDate: { lte: endOfToday },
          endDate: { gte: startOfToday },
          ...scopeFilter,
          user: { offboardedAt: null },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    return {
      totalEmployees,
      active: totalEmployees,
      onLeave: onLeaveRows.length,
    };
  }
}
