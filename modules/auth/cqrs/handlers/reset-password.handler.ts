import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { ResetPasswordCommand } from '../command/reset-password.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ resetToken, newPassword }: ResetPasswordCommand) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: resetToken },
    });

    if (!user) throw new NotFoundException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        mustChangePassword: false,
      },
    });

    return { message: 'Password reset successfully. You can now log in.' };
  }
}
