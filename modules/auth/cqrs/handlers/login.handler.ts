import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginCommand } from '../command/login.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TokenService } from 'modules/auth/token.services';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async execute({ loginDto }: LoginCommand) {
    const user = await this.prismaService.user.findFirst({
      where: { email: loginDto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid Credentials');

    const passwordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordMatch) throw new UnauthorizedException('Invalid Credentials');

    const { password, ...userWithoutPassword } = user;

    const tokens = await this.tokenService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      departmentId: user.departmentId,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return {
      user: userWithoutPassword,
      message: 'Successfully logged in',
      ...tokens,
    };
  }
}
