import { UpdateUserDto } from '../../dto/update-user.dto';

export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly dto: UpdateUserDto,
  ) {}
}
