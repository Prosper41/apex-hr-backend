export class GetLeavePoliciesForUserQuery {
  constructor(
    public readonly tenantId: string,
    public readonly departmentId: string | null,
  ) {}
}
