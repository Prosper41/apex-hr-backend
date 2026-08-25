import { Role } from '@prisma/client';

export class GetPendingApprovalsQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly role: Role,
    public readonly departmentId: string | null,
  ) {}
}
