import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveUserCommand } from '../commands/remove-user.command';
import { PrismaService } from '@infra/database/prisma/prisma.service'; 
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(RemoveUserCommand)
export class RemoveUserHandler implements ICommandHandler<RemoveUserCommand> {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(command: RemoveUserCommand) {
    const { tenantId, id, email, firstName, lastName } = command;

    if (!id && !email && !firstName && !lastName) {
      throw new BadRequestException(
        'At least one identifier (id, email, first name, or last name) must be provided',
      );
    }

    const user = id
      ? await this.prismaService.user.findFirst({
          where: { id, tenantId, offboardedAt: null },
        })
      : await this.prismaService.user.findFirst({
          where: {
            tenantId,
            offboardedAt: null,
            ...(email && { email }),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
          },
        });

    if (!user) throw new NotFoundException('User not found');

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { offboardedAt: new Date() },
    });

    return { message: 'User removed successfully' };
  }
}
