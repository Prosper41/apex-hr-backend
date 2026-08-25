import { UpdateDepartmentDto } from 'modules/department/application/dtos/update-department.dto';

export class UpdateDepartmentCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateDepartmentDto,
  ) {}
}
