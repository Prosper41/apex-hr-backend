import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetDepartmentByIdQuery } from '../queries/get-department-by-id.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@QueryHandler(GetDepartmentByIdQuery)
export class GetDepartmentByIdHandler implements IQueryHandler<GetDepartmentByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetDepartmentByIdQuery) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }
}
