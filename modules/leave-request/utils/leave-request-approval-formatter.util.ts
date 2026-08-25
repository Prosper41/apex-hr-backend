import { LeaveRequestStatus } from '@prisma/client';

export function deriveCurrentStage(
  status: LeaveRequestStatus,
): 'team_lead' | 'dept_head' | 'hr' | null {
  switch (status) {
    case 'PENDING':
      return 'team_lead';
    case 'TEAM_LEAD_COMMENTED':
      return 'dept_head';
    case 'DEPT_APPROVED':
      return 'hr';
    default:
      return null;
  }
}

/** Attaches per-stage approval status/approver info to a leave request for the frontend. */
export function formatLeaveRequestApprovals(r: any) {
  const teamLeadWasSkipped =
    !!r.teamLeadApproverId && r.teamLeadApproverId === r.userId;

  const teamLeadStatus = teamLeadWasSkipped
    ? 'skipped'
    : r.teamLeadApproverId
      ? 'commented'
      : r.status === 'REJECTED' && !r.deptApproverId && !r.hrApproverId
        ? 'rejected'
        : 'pending';

  const deptHeadStatus =
    r.status === 'DEPT_APPROVED' || r.status === 'APPROVED'
      ? 'approved'
      : r.status === 'REJECTED' && r.deptApproverId
        ? 'rejected'
        : !!r.deptApproverId && r.deptApproverId === r.userId
          ? 'skipped'
          : 'pending';

  const hrStatus =
    r.status === 'APPROVED'
      ? 'approved'
      : r.status === 'REJECTED' && r.hrApproverId
        ? 'rejected'
        : r.status === 'DEPT_APPROVED'
          ? 'pending'
          : 'not_reached';

  return {
    ...r,
    currentStage: deriveCurrentStage(r.status),
    teamLeadApproval: {
      status: teamLeadStatus,
      commentedAt: r.teamLeadApprovedAt?.toISOString() ?? null,
      commentedBy: r.teamLeadApprover ?? null,
    },
    deptHeadApproval: {
      status: deptHeadStatus,
      approvedAt: r.deptApprovedAt?.toISOString() ?? null,
      approvedBy: r.deptApprover ?? null,
    },
    hrApproval: {
      status: hrStatus,
      approvedAt: r.hrApprovedAt?.toISOString() ?? null,
      approvedBy: r.hrApprover ?? null,
    },
  };
}
