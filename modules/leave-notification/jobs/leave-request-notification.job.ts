export enum LeaveNotificationJobType {
  SUBMITTED = 'leave.submitted',
  TEAM_LEAD_COMMENTED = 'leave.team-lead-commented',
  DEPT_APPROVED = 'leave.dept-approved',
  APPROVED = 'leave.approved',
  REJECTED = 'leave.rejected',
  CANCELLED = 'leave.cancelled',
}

export interface LeaveRequestNotificationJobData {
  type: LeaveNotificationJobType;
  leaveRequestId: string;
  tenantId: string;
  departmentId: string;
}
