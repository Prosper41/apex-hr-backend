export class ReserveLeaveBalanceCommand {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly leavePolicyId: string,
    public readonly leaveRequestId: string,
    public readonly days: number,
    public readonly effectiveDate: Date,
  ) {}
}
