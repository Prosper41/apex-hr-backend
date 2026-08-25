import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetAllLeaveRequestsQuery } from '../queries/get-all-leave-requests.query';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import {
  computeIsUnscoped,
  ResolvedActor,
} from '../../leave-request-access.helper';
import { resolveStatusFilter } from '../../utils/leave-request-status-filter.util';
import { formatLeaveRequestApprovals } from '../../utils/leave-request-approval-formatter.util';

@QueryHandler(GetAllLeaveRequestsQuery)
export class GetAllLeaveRequestsHandler implements IQueryHandler<GetAllLeaveRequestsQuery> {
  private readonly logger = new Logger(GetAllLeaveRequestsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute({ tenantId, departmentId, role }: GetAllLeaveRequestsQuery) {
    const actor: ResolvedActor = {
      id: '',
      role,
      departmentId: departmentId ?? null,
      tenantId,
    };
    const isUnscoped = await computeIsUnscoped(this.prisma, actor);
    const statusFilter = resolveStatusFilter(role, isUnscoped);

    this.logger.debug(
      `Fetching leave requests — role=${role}, isUnscoped=${isUnscoped}, statusFilter=${JSON.stringify(statusFilter)}, dept=${departmentId ?? 'n/a'}`,
    );

    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        ...(!isUnscoped && departmentId ? { departmentId } : {}),
        ...statusFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        leavePolicy: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
        teamLeadApprover: {
          select: { id: true, firstName: true, lastName: true },
        },
        deptApprover: { select: { id: true, firstName: true, lastName: true } },
        hrApprover: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(`Query returned ${requests.length} result(s)`);
    return requests.map(formatLeaveRequestApprovals);
  }
}
