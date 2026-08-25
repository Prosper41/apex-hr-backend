export class RemoveLeavePolicyCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
  ) {}
}
