export class RestoreUserCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
