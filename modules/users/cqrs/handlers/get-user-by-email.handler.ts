import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetUserByEmailQuery } from '../queries/get-user-by-email.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
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

  async execute({ email, tenantId }: GetUserByEmailQuery) {
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId, offboardedAt: null },
      select: this.userSelect,
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
