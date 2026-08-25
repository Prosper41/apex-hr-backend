export class CancelLeaveRequestCommand {
  constructor(
    public readonly leaveRequestId: string,
    public readonly tenantId: string,
    public readonly requesterId: string,
  ) {}
}
