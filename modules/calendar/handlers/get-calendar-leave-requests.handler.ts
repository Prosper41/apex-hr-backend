import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCalendarLeaveRequestsQuery } from '../queries/get-calendar-leave-requests.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';

@QueryHandler(GetCalendarLeaveRequestsQuery)
export class GetCalendarLeaveRequestsHandler implements IQueryHandler<GetCalendarLeaveRequestsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    tenantId,
    departmentId,
    role,
    month,
    year,
  }: GetCalendarLeaveRequestsQuery) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const isUnscoped = role === Role.HR_ADMIN || role === Role.TENANT_ADMIN;

    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        ...(!isUnscoped && departmentId ? { departmentId } : {}),
        status: {
          in: ['PENDING', 'TEAM_LEAD_COMMENTED', 'DEPT_APPROVED', 'APPROVED'],
        },
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          {
            startDate: { lte: startOfMonth },
            endDate: { gte: endOfMonth },
          },
        ],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        isHalfDay: true,
        status: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        leavePolicy: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return requests.map((r) => ({
      id: r.id,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      totalDays: r.totalDays,
      isHalfDay: r.isHalfDay,
      status: r.status,
      leaveType: r.leavePolicy.type,
      leaveName: r.leavePolicy.name,
      employee: {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        initials: `${r.user.firstName[0]}${r.user.lastName[0]}`.toUpperCase(),
        role: r.user.role,
      },
      department: r.department,
    }));
  }
}
