import { RegisterDto } from 'modules/auth/dto/register.dto';

export class RegisterUserCommand {
  constructor(
    public readonly dto: RegisterDto,
    public readonly tenantId: string,
  ) {}
}
