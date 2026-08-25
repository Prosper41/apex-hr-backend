import { CreateDepartmentDto } from 'modules/department/application/dtos/create-department.dto';
export class CreateDepartmentCommand {
  constructor(
    public readonly dto: CreateDepartmentDto,
    public readonly tenantId: string,
  ) {}
}
