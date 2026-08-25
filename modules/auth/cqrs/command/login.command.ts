import { LoginDto } from 'modules/auth/dto/login.dto';

export class LoginCommand {
  constructor(public readonly loginDto: LoginDto) {}
}
