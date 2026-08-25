export class MarkNotificationReadCommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
