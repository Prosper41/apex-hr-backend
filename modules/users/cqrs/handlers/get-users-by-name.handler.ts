import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetUsersByNameQuery } from '../queries/get-users-by-name.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@QueryHandler(GetUsersByNameQuery)
export class GetUsersByNameHandler implements IQueryHandler<GetUsersByNameQuery> {
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
    offboardedAt: true,
    joinedAt: true,
    createdAt: true,
    updatedAt: true,
  };

  async execute({
    tenantId,
    paginationDto: pagination,
    firstName,
    lastName,
  }: GetUsersByNameQuery) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      offboardedAt: null,
      OR: [
        ...(firstName ? [{ firstName }] : []),
        ...(lastName ? [{ lastName }] : []),
      ],
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: this.userSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    if (!users.length)
      throw new NotFoundException('No users found with that name');

    return { data: users, meta: this.paginate(total, page, limit) };
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
