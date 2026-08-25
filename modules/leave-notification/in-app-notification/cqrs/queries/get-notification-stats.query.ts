export class GetNotificationStatsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}
