import { LeaveRequestStatus, Role } from '@prisma/client';

const HR_VISIBLE_STATUSES: LeaveRequestStatus[] = [
  'DEPT_APPROVED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

/**
 * Which statuses a role is allowed to see.
 * - Team Lead / Dept Head: no status filter — full history within their department (current + resolved).
 * - HR Admin: only sees from DEPT_APPROVED onward (their stage plus resolved history).
 * - Unscoped actors (Tenant Admin, real HR): see everything.
 */
export function resolveStatusFilter(role: Role, isUnscoped: boolean) {
  if (isUnscoped) return {};
  if (role === Role.HR_ADMIN) return { status: { in: HR_VISIBLE_STATUSES } };
  return {};
}
