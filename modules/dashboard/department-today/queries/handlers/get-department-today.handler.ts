import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveRequestStatus } from '@prisma/client';
import { GetDepartmentTodayQuery } from '../get-department-today.query';
import {
  DepartmentAbsentCountDto,
  DepartmentTodayResponseDto,
} from '../../dto/department-today-response.dto';

@QueryHandler(GetDepartmentTodayQuery)
export class GetDepartmentTodayHandler implements IQueryHandler<GetDepartmentTodayQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetDepartmentTodayQuery,
  ): Promise<DepartmentTodayResponseDto> {
    const tenantId = query.tenantId;

    const startOfToday = this.getStartOfToday();
    const endOfToday = this.getEndOfToday();

    const departments = await this.prisma.department.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });

    const departmentAbsentCounts: DepartmentAbsentCountDto[] = [];

    // Simple loop instead of a dense Promise.all chain, so it's easy to
    // follow: for each department, find out how many people are absent today.
    for (const department of departments) {
      const absentCount = await this.countAbsentEmployeesInDepartment(
        tenantId,
        department.id,
        startOfToday,
        endOfToday,
      );

      departmentAbsentCounts.push({
        departmentName: department.name,
        absentCount,
      });
    }

    return { departments: departmentAbsentCounts };
  }

  /**
   * Counts distinct employees in one department who have an APPROVED
   * leave request that covers today's date.
   */
  private async countAbsentEmployeesInDepartment(
    tenantId: string,
    departmentId: string,
    startOfToday: Date,
    endOfToday: Date,
  ): Promise<number> {
    const absentEmployees = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        departmentId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return absentEmployees.length;
  }

  private getStartOfToday(): Date {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday;
  }

  private getEndOfToday(): Date {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return endOfToday;
  }
}
