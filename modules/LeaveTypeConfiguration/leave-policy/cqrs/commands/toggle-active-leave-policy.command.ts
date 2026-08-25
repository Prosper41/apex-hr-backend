export class ToggleActiveLeavePolicyCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
  ) {}
}
