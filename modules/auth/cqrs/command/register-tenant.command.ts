import { RegisterTenantDto } from 'modules/auth/dto/register-tenant.dto';

export class RegisterTenantCommand {
  constructor(public readonly registerTenantDto: RegisterTenantDto) {}
}
