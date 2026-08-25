export class GetLeavePolicyByIdQuery {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
  ) {}
}
