import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { GetMyLeaveRequestsQuery } from '../queries/get-my-leave-requests.query'; 

@QueryHandler(GetMyLeaveRequestsQuery)
export class GetMyLeaveRequestsHandler implements IQueryHandler<GetMyLeaveRequestsQuery> {
  private readonly logger = new Logger(GetMyLeaveRequestsHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, tenantId }: GetMyLeaveRequestsQuery) {
    this.logger.debug(`Fetching leave requests for user ${userId}`);
    return this.prisma.leaveRequest.findMany({
      where: { userId, tenantId },
      include: {
        leavePolicy: { select: { id: true, name: true, type: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
