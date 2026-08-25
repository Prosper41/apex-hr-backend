import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { GetDepartmentStatsQuery } from '../queries/get-department-stats.query';
import { DepartmentStatsResponseDto } from '../dtos/department-stats-response.dto';
import { DepartmentStaffingStatsService } from '../department-staffing-stats.service';
import {
  computeIsUnscoped,
  ResolvedActor,
} from 'modules/leave-request/leave-request-access.helper';

@QueryHandler(GetDepartmentStatsQuery)
export class GetDepartmentStatsHandler implements IQueryHandler<GetDepartmentStatsQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffingStats: DepartmentStaffingStatsService,
  ) {}

  async execute(
    query: GetDepartmentStatsQuery,
  ): Promise<DepartmentStatsResponseDto> {
    const { tenantId, role, departmentId, userId } = query;

    const actor: ResolvedActor = { id: userId, role, departmentId, tenantId };
    const isUnscoped = await computeIsUnscoped(this.prisma, actor);
    const scopeFilter = !isUnscoped && departmentId ? { departmentId } : {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [staffing, departments] = await Promise.all([
      this.staffingStats.getStats({
        tenantId,
        scopeFilter,
        startOfToday,
        endOfToday,
      }),
      this.prisma.department.count({ where: { tenantId, isActive: true } }),
    ]);

    return { ...staffing, departments };
  }
}
