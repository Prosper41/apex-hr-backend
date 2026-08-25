export class NotifyRejectedCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
  ) {}
}
