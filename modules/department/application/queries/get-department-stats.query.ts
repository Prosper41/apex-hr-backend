import { Role } from '@prisma/client';

export class GetDepartmentStatsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly role: Role,
    public readonly departmentId: string | null,
    public readonly userId: string,
  ) {}
}
