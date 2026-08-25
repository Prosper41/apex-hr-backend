import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';

export interface ConflictWarning {
  detected: boolean;
  affectedDates: string[];
  departmentOffCount: number;
  departmentSize: number;
  percentageOff: number;
}

@Injectable()
export class ConflictDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  async detect(
    departmentId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date,
    excludeLeaveRequestId: string,
  ): Promise<ConflictWarning | null> {
    const departmentSize = await this.prisma.user.count({
      where: { departmentId, tenantId },
    });

    if (departmentSize === 0) return null;

    const threshold = 0.2;

    const overlappingRequests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        departmentId,
        id: { not: excludeLeaveRequestId },
        status: {
          in: ['PENDING', 'TEAM_LEAD_COMMENTED', 'DEPT_APPROVED', 'APPROVED'],
        },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { startDate: true, endDate: true },
    });

    if (overlappingRequests.length === 0) return null;

    const affectedDates: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const offOnThisDay = overlappingRequests.filter(
          (r) => r.startDate <= current && r.endDate >= current,
        ).length;

        if (offOnThisDay / departmentSize > threshold) {
          affectedDates.push(current.toISOString().split('T')[0]);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    if (affectedDates.length === 0) return null;

    const peakOffCount = Math.max(
      ...affectedDates.map((dateStr) => {
        const date = new Date(dateStr);
        return overlappingRequests.filter(
          (r) => r.startDate <= date && r.endDate >= date,
        ).length;
      }),
    );

    return {
      detected: true,
      affectedDates,
      departmentOffCount: peakOffCount,
      departmentSize,
      percentageOff: Math.round((peakOffCount / departmentSize) * 100),
    };
  }
}
