import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { RemoveDepartmentCommand } from '../commands/remove-department.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(RemoveDepartmentCommand)
export class RemoveDepartmentHandler implements ICommandHandler<RemoveDepartmentCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: RemoveDepartmentCommand) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) throw new NotFoundException('Department not found');

    await this.prisma.department.delete({ where: { id } });

    return { message: 'Department deleted successfully' };
  }
}
