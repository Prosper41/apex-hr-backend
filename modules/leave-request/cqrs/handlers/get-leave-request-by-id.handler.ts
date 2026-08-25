import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { Role } from '@prisma/client';
import { GetLeaveRequestByIdQuery } from '../queries/get-leave-request-by-id.query'; 
const TENANT_WIDE_ROLES: Role[] = [Role.HR_ADMIN, Role.TENANT_ADMIN];

@QueryHandler(GetLeaveRequestByIdQuery)
export class GetLeaveRequestByIdHandler implements IQueryHandler<GetLeaveRequestByIdQuery> {
  private readonly logger = new Logger(GetLeaveRequestByIdHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute({
    id,
    userId,
    tenantId,
    role,
    departmentId,
  }: GetLeaveRequestByIdQuery) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        leavePolicy: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    const isOwner = leaveRequest.userId === userId;
    const isTenantWideApprover = TENANT_WIDE_ROLES.includes(role);
    const isDeptApprover =
      (role === Role.TEAM_LEAD || role === Role.DEPT_HEAD) &&
      departmentId === leaveRequest.departmentId;

    if (!isOwner && !isTenantWideApprover && !isDeptApprover) {
      this.logger.warn(
        `User ${userId} (${role}) denied access to leave request ${id}`,
      );
      throw new ForbiddenException(
        'You do not have access to this leave request',
      );
    }

    return leaveRequest;
  }
}
