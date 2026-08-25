import { ChangePasswordDto } from 'modules/auth/dto/change-password.dto';

export class ChangePasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly changePasswordDto: ChangePasswordDto,
  ) {}
}
