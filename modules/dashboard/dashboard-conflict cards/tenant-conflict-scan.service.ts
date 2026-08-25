import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';

/**
 * Tenant-wide conflict scan for the dashboard "Conflicts" card.
 * Checks every active department over a date window and returns a count
 * of departments currently breaching the 20% off-at-once threshold.
 * APPROVED requests only — pending/commented/dept-approved are excluded
 * because the dashboard reports confirmed conflicts, not potential ones.
 *
 * Lives in the dashboard module on purpose: this is a dashboard-reporting
 * concern, not a leave-request domain concern, so it doesn't touch
 * leave-request's ConflictDetectionService.
 */
@Injectable()
export class TenantConflictScanService {
  private readonly threshold = 0.2;

  constructor(private readonly prisma: PrismaService) {}

  async countConflictingDepartments(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const departments = await this.prisma.department.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    let conflictingDepartments = 0;

    for (const { id: departmentId } of departments) {
      const departmentSize = await this.prisma.user.count({
        where: { departmentId, tenantId },
      });

      if (departmentSize === 0) continue;

      const overlapping = await this.prisma.leaveRequest.findMany({
        where: {
          tenantId,
          departmentId,
          status: 'APPROVED',
          startDate: { lte: toDate },
          endDate: { gte: fromDate },
        },
        select: { startDate: true, endDate: true },
      });

      if (overlapping.length === 0) continue;

      if (
        this.breachesThreshold(overlapping, departmentSize, fromDate, toDate)
      ) {
        conflictingDepartments += 1;
      }
    }

    return conflictingDepartments;
  }

  private breachesThreshold(
    requests: { startDate: Date; endDate: Date }[],
    departmentSize: number,
    fromDate: Date,
    toDate: Date,
  ): boolean {
    const current = new Date(fromDate);

    while (current <= toDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const offCount = requests.filter(
          (r) => r.startDate <= current && r.endDate >= current,
        ).length;

        if (offCount / departmentSize > this.threshold) {
          return true;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return false;
  }
}
