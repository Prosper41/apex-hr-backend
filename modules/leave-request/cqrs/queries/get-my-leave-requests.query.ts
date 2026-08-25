export class GetMyLeaveRequestsQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
