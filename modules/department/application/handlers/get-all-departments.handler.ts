import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAllDepartmentsQuery } from '../queries/get-all-departments.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@QueryHandler(GetAllDepartmentsQuery)
export class GetAllDepartmentsHandler implements IQueryHandler<GetAllDepartmentsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ tenantId }: GetAllDepartmentsQuery) {
    return this.prisma.department.findMany({
      where: { tenantId },
    });
  }
}
