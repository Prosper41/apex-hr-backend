export class RemoveUserCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id?: string,
    public readonly email?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
  ) {}
}
