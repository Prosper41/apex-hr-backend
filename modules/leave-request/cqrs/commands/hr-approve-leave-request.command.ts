export class HrApproveLeaveRequestCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
  ) {}
}
