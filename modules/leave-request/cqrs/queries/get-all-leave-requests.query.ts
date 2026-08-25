import { Role } from '@prisma/client';

export class GetAllLeaveRequestsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly departmentId: string | undefined,
    // Role is required so the handler can apply HR-stage visibility filtering
    // without a second DB round-trip to look up the caller.
    public readonly role: Role,
  ) {}
}
