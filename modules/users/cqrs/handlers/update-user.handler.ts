import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserCommand } from '../commands/update-user.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, tenantId, dto }: UpdateUserCommand) {
    //  Verify user exists within the tenant before updating
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, offboardedAt: null },
    });

    if (!user) throw new NotFoundException('User not found');

    // If departmentId provided, verify it belongs to the same tenant
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, tenantId },
      });
      if (!dept) throw new NotFoundException('Department not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.contact !== undefined && { contact: dto.contact }),
        ...(dto.houseAddress !== undefined && {
          houseAddress: dto.houseAddress,
        }),
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: new Date(dto.dateOfBirth),
        }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.departmentId !== undefined && {
          departmentId: dto.departmentId,
        }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        contact: true,
        houseAddress: true,
        dateOfBirth: true,
        role: true,
        departmentId: true,
        department: { select: { id: true, name: true } },

        updatedAt: true,
      },
    });

    return { message: 'User updated successfully', user: updated };
  }
}
