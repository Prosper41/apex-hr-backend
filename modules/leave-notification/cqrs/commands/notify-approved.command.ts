export class NotifyApprovedCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
  ) {}
}
