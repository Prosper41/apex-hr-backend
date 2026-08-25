export class GetCalendarBirthdaysQuery {
  constructor(
    public readonly tenantId: string,
    public readonly month: number,
    public readonly year: number,
  ) {}
}
