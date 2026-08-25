export enum AuditAction {
  // ── Leave Request lifecycle ───────────────────────────────────
  LEAVE_SUBMITTED = 'LEAVE_SUBMITTED',
  LEAVE_TEAM_LEAD_COMMENTED = 'LEAVE_TEAM_LEAD_COMMENTED',
  LEAVE_DEPT_APPROVED = 'LEAVE_DEPT_APPROVED',
  LEAVE_HR_APPROVED = 'LEAVE_HR_APPROVED',
  LEAVE_REJECTED = 'LEAVE_REJECTED',
  LEAVE_CANCELLED = 'LEAVE_CANCELLED',

  // ── Leave Balance operations ──────────────────────────────────
  BALANCE_RESERVED = 'BALANCE_RESERVED', // pending hold on submission
  BALANCE_CONFIRMED = 'BALANCE_CONFIRMED', // deducted on HR approval
  BALANCE_RELEASED = 'BALANCE_RELEASED', // restored on rejection/cancel
  BALANCE_ADJUSTED = 'BALANCE_ADJUSTED', // HR manual override (US.5)
  BALANCE_ACCRUED = 'BALANCE_ACCRUED', // scheduled accrual run

  // ── Leave Policy ─────────────────────────────────────────────
  POLICY_CREATED = 'POLICY_CREATED',
  POLICY_UPDATED = 'POLICY_UPDATED',
  POLICY_TOGGLED = 'POLICY_TOGGLED', // isActive flipped
  POLICY_DELETED = 'POLICY_DELETED',

  // ── Department ───────────────────────────────────────────────
  DEPARTMENT_CREATED = 'DEPARTMENT_CREATED',
  DEPARTMENT_UPDATED = 'DEPARTMENT_UPDATED',
  DEPARTMENT_DELETED = 'DEPARTMENT_DELETED',

  // ── User / Employee ──────────────────────────────────────────
  EMPLOYEE_CREATED = 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED = 'EMPLOYEE_UPDATED',
  EMPLOYEE_DELETED = 'EMPLOYEE_DELETED',
}
