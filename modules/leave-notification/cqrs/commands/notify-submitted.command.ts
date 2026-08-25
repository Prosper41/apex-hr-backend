export class NotifySubmittedCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
    public readonly departmentId: string,
  ) {}
}
