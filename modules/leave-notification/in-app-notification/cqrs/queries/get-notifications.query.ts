export class GetNotificationsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly filter: 'all' | 'unread' | 'high-priority' = 'all',
  ) {}
}
