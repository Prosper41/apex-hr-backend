import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAllUsersQuery } from '../queries/get-all-users.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@QueryHandler(GetAllUsersQuery)
export class GetAllUsersHandler implements IQueryHandler<GetAllUsersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userSelect = {
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
    createdAt: true,
    offboardedAt: true,
    joinedAt: true,
    updatedAt: true,
  };

  async execute({ tenantId, pagination }: GetAllUsersQuery) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: {
          tenantId,
          offboardedAt: null,
        },
        select: this.userSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: {
          tenantId,
          offboardedAt: null,
        },
      }),
    ]);

    return {
      data: users,
      meta: this.paginate(total, page, limit),
    };
  }

  private paginate(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    };
  }
}
