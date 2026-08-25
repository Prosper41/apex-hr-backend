export class GetMyLeaveBalancesQuery {
  constructor(
    public readonly employeeId: string,
    public readonly tenantId: string,
  ) {}
}
