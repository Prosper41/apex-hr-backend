export class NotifyTeamLeadCommentedCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
    public readonly departmentId: string,
  ) {}
}
