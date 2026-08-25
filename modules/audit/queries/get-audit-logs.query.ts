export class GetAuditLogsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly entityType?: string,
    public readonly entityId?: string,
    public readonly actorId?: string,
    public readonly action?: string,
    public readonly from?: Date,
    public readonly to?: Date,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}
