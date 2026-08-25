export class Department {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | null,
    public readonly tenantId: string,
  ) {}
}
