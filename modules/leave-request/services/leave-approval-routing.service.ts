import { Injectable, Logger } from '@nestjs/common';
import { Role, LeaveRequestStatus } from '@prisma/client';

interface RoutingResult {
  status: LeaveRequestStatus;
  stamps: Record<string, string | Date>;
}

const STAGE_ORDER: LeaveRequestStatus[] = [
  LeaveRequestStatus.PENDING,
  LeaveRequestStatus.TEAM_LEAD_COMMENTED,
  LeaveRequestStatus.DEPT_APPROVED,
  LeaveRequestStatus.APPROVED,
];

@Injectable()
export class LeaveApprovalRoutingService {
  private readonly logger = new Logger(LeaveApprovalRoutingService.name);

  resolveInitialRouting(submitterId: string, role: Role): RoutingResult {
    const now = new Date();
    if (role === Role.TEAM_LEAD) {
      return {
        status: LeaveRequestStatus.TEAM_LEAD_COMMENTED,
        stamps: { teamLeadApproverId: submitterId, teamLeadApprovedAt: now },
      };
    }
    if (role === Role.DEPT_HEAD || role === Role.HR_ADMIN) {
      return {
        status: LeaveRequestStatus.DEPT_APPROVED,
        stamps: {
          teamLeadApproverId: submitterId,
          teamLeadApprovedAt: now,
          deptApproverId: submitterId,
          deptApprovedAt: now,
        },
      };
    }
    return { status: LeaveRequestStatus.PENDING, stamps: {} };
  }

  /** HR can't approve their own request, so HR submissions escalate to Tenant Admin instead. */
  resolveFinalApproverRole(submitterRole: Role): Role {
    return submitterRole === Role.HR_ADMIN ? Role.TENANT_ADMIN : Role.HR_ADMIN;
  }

  requiredRoleForStage(status: LeaveRequestStatus, submitterRole: Role): Role {
    if (status === LeaveRequestStatus.TEAM_LEAD_COMMENTED)
      return Role.DEPT_HEAD;
    return this.resolveFinalApproverRole(submitterRole);
  }

  nextStatusOnApprove(status: LeaveRequestStatus): LeaveRequestStatus {
    const next = STAGE_ORDER[STAGE_ORDER.indexOf(status) + 1];
    this.logger.debug(`Stage transition: ${status} -> ${next}`);
    return next;
  }

  isCancellable(status: LeaveRequestStatus): boolean {
    const cancellableStages: LeaveRequestStatus[] = [
      LeaveRequestStatus.PENDING,
      LeaveRequestStatus.TEAM_LEAD_COMMENTED,
      LeaveRequestStatus.DEPT_APPROVED,
    ];
    return cancellableStages.includes(status);
  }
}
