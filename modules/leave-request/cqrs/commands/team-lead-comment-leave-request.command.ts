export class TeamLeadCommentLeaveRequestCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly comment: string,
  ) {}
}
