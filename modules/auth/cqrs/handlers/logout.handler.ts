import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from '../command/logout.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(private readonly prismaService: PrismaService) {}

  async execute({ refreshToken }: LogoutCommand) {
    const token = await this.prismaService.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!token) throw new UnauthorizedException('Invalid refresh token');

    await this.prismaService.refreshToken.delete({ where: { id: token.id } });

    return { message: 'Successfully logged out' };
  }
}
