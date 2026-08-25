import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ChangePasswordCommand } from '../command/change-password.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ changePasswordDto, userId }: ChangePasswordCommand) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    const passwordMatch = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );
    if (!passwordMatch) throw new UnauthorizedException('Invalid old password');

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordResetToken: null,
      },
    });

    return { message: 'Password changed successfully' };
  }
}
