export class GetCalendarPublicHolidaysQuery {
  constructor(
    public readonly month: number,
    public readonly year: number,
  ) {}
}
