export class GetUserByEmailQuery {
  constructor(
    public readonly tenantId: string,
    public readonly email: string,
  ) {}
}
