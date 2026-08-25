export class GetCalendarLeaveRequestsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly departmentId: string | undefined,
    public readonly role: string,
    public readonly month: number,
    public readonly year: number,
  ) {}
}
