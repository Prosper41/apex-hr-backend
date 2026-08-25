export class RejectLeaveRequestCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly reason?: string,
  ) {}
}
