import { Role } from '@prisma/client';

export class GetLeaveRequestByIdQuery {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly role: Role,
    public readonly departmentId: string | null,
  ) {}
}
