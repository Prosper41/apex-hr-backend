import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { RegisterTenantCommand } from '../command/register-tenant.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { MailService } from '@infra/mail/mail.service';
import { TokenService } from 'modules/auth/token.services';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';


@CommandHandler(RegisterTenantCommand)
export class RegisterTenantHandler implements ICommandHandler<RegisterTenantCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
  ) {}

  async execute({ registerTenantDto: dto }: RegisterTenantCommand) {
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { name: dto.companyName },
    });
    if (existingTenant) {
      throw new ConflictException('A company with this name already exists');
    }

    const existingEmail = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        'A user with this email already exists in a company',
      );
    }

    const tempPassword = Math.random().toString(36).slice(-8) + 'A@1';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        companyType: dto.companyType,
        companyPhone: dto.companyPhone,
        companyLocation: dto.companyLocation,
        registeredAt: new Date(),
        users: {
          create: {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: Role.TENANT_ADMIN,
            mustChangePassword: true,
          },
        },
      },
      include: { users: true },
    });

    const tenantAdmin = tenant.users[0];

    this.mailService.sendTenantWelcomeEmail(
      dto.email,
      dto.firstName,
      dto.companyName,
      tempPassword,
    );

    const tokens = await this.tokenService.generateTokens({
      userId: tenantAdmin.id,
      email: tenantAdmin.email,
      role: tenantAdmin.role,
      tenantId: tenant.id,
      departmentId: tenantAdmin.departmentId ?? null, // ← added (TENANT_ADMIN has no dept)
      firstName: tenantAdmin.firstName,
      lastName: tenantAdmin.lastName,
    });

    const { password, ...tenantAdminWithoutPassword } = tenantAdmin;

    return {
      message:
        'Company registered successfully. Check your email for login credentials.',
      tenant: { id: tenant.id, name: tenant.name },
      user: tenantAdminWithoutPassword,
      ...tokens,
    };
  }
}