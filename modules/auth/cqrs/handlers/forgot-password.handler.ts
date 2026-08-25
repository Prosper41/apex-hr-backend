import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForgotPasswordCommand } from '../command/forgot-password.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { MailService } from '@infra/mail/mail.service';
import { v4 as uuidv4 } from 'uuid';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async execute({ email }: ForgotPasswordCommand) {
    const user = await this.prisma.user.findFirst({ where: { email } });

    if (!user) {
      return { message: 'If this email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken },
    });

    this.mailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken,
    );

    return { message: 'If this email exists, a reset link has been sent' };
  }
}
