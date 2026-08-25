import { ICommandHandler } from '@nestjs/cqrs';
import { RestoreUserCommand } from '../command/restore-user.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

export class RestoreUserHandler implements ICommandHandler<RestoreUserCommand> {
  constructor(private readonly prisma: PrismaService) {}
  async execute({ userId, tenantId }: RestoreUserCommand) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.offboardedAt) {
      throw new ConflictException('User is already active');
    }

    const restoredUser = await this.prisma.user.update({
      where: { id: userId },
      data: { offboardedAt: null, joinedAt: new Date() },
    });
    const { password, ...userWithoutPassword } = restoredUser;
    return {
      success: true,
      message: 'User restored successfully',
      userWithoutPassword,
    };
  }
}
