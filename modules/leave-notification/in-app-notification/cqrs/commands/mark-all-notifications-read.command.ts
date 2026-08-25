export class MarkAllNotificationsReadCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
