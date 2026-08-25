export class NotifyCancelledCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
  ) {}
}
