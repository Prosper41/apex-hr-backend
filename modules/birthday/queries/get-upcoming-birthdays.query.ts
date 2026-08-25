export class GetUpcomingBirthdaysQuery {
  constructor(
    public readonly tenantId: string,
    public readonly today: Date,
    public readonly windowDays: number = 7,
  ) {}
}
