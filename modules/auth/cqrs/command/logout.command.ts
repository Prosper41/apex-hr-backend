import { LogoutDto } from 'modules/auth/dto/logout.dto';

export class LogoutCommand {
  constructor(public readonly refreshToken: string) {}
}
