import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateDepartmentCommand } from '../commands/create-department.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(CreateDepartmentCommand)
export class CreateDepartmentHandler implements ICommandHandler<CreateDepartmentCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ dto, tenantId }: CreateDepartmentCommand) {
    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          name: dto.name,
          description: dto.description,
          tenantId,
        },
      });

      if (dto.isHrDepartment) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { hrDepartmentId: department.id },
        });
      }

      return department;
    });
  }
}
