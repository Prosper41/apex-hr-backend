import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveRequestStatus, Role } from '@prisma/client';
import { GetPendingApprovalsQuery } from '../get-pending-approvals.query';
import {
  PendingApprovalItemDto,
  PendingApprovalsResponseDto,
} from '../../dto/pending-approvals-response.dto';
import {
  computeIsUnscoped,
  ResolvedActor,
} from 'modules/leave-request/leave-request-access.helper';

// Maps each approver role to the one leave request status that is
// currently sitting at that role's stage.
const STATUS_FOR_ROLE: Partial<Record<Role, LeaveRequestStatus>> = {
  [Role.TEAM_LEAD]: LeaveRequestStatus.PENDING,
  [Role.DEPT_HEAD]: LeaveRequestStatus.TEAM_LEAD_COMMENTED,
  [Role.HR_ADMIN]: LeaveRequestStatus.DEPT_APPROVED,
};

// Matches each status back to a friendly stage name for the frontend.
const STAGE_FOR_STATUS: Record<string, 'team_lead' | 'dept_head' | 'hr'> = {
  PENDING: 'team_lead',
  TEAM_LEAD_COMMENTED: 'dept_head',
  DEPT_APPROVED: 'hr',
};

@QueryHandler(GetPendingApprovalsQuery)
export class GetPendingApprovalsHandler implements IQueryHandler<GetPendingApprovalsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetPendingApprovalsQuery,
  ): Promise<PendingApprovalsResponseDto> {
    const actor: ResolvedActor = {
      id: query.userId,
      role: query.role,
      departmentId: query.departmentId,
      tenantId: query.tenantId,
    };

    const isUnscoped = await computeIsUnscoped(this.prisma, actor);

    const statusesToShow = this.getStatusesForActor(actor.role, isUnscoped);

    if (statusesToShow.length === 0) {
      return { requests: [], totalPending: 0 };
    }

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId: actor.tenantId,
        status: { in: statusesToShow },
        ...(!isUnscoped && actor.departmentId
          ? { departmentId: actor.departmentId }
          : {}),
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        status: true,
        user: {
          select: { firstName: true, lastName: true, role: true },
        },
        leavePolicy: {
          select: { type: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const requests: PendingApprovalItemDto[] = leaveRequests.map((request) => ({
      leaveRequestId: request.id,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      role: request.user.role,
      leaveType: request.leavePolicy.type,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      currentStage: STAGE_FOR_STATUS[request.status],
    }));

    return { requests, totalPending: requests.length };
  }

  /**
   * TEAM_LEAD, DEPT_HEAD, and HR_ADMIN each only review requests sitting
   * at their own stage. An unscoped actor (TENANT_ADMIN, or the HR_ADMIN
   * assigned to the HR department) oversees everything, so they see
   * requests waiting at any stage. EMPLOYEE never approves, so they get
   * nothing here.
   */
  private getStatusesForActor(
    role: Role,
    isUnscoped: boolean,
  ): LeaveRequestStatus[] {
    if (isUnscoped) {
      return [
        LeaveRequestStatus.PENDING,
        LeaveRequestStatus.TEAM_LEAD_COMMENTED,
        LeaveRequestStatus.DEPT_APPROVED,
      ];
    }

    const status = STATUS_FOR_ROLE[role];
    return status ? [status] : [];
  }
}
