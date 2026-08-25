import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { UpdateDepartmentCommand } from '../commands/update-department.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(UpdateDepartmentCommand)
export class UpdateDepartmentHandler implements ICommandHandler<UpdateDepartmentCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id, dto }: UpdateDepartmentCommand) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.department.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Department not found');

      const department = await tx.department.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      if (dto.isHrDepartment === true) {
        await tx.tenant.update({
          where: { id: department.tenantId },
          data: { hrDepartmentId: department.id },
        });
      } else if (dto.isHrDepartment === false) {
        // Only clear the pointer if THIS department currently holds it
        await tx.tenant.updateMany({
          where: { id: department.tenantId, hrDepartmentId: department.id },
          data: { hrDepartmentId: null },
        });
      }

      return department;
    });
  }
}
