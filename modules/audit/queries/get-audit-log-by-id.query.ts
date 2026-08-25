// ── Query ──────────────────────────────────────────────────────
export class GetAuditLogByIdQuery {
  constructor(
    public readonly id: string,
    public readonly tenantId: string, // enforces tenant isolation
  ) {}
}
