import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { GetAuditLogsQuery } from '../get-audit-logs.query';

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: Date;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetAuditLogsQuery)
export class GetAuditLogsHandler implements IQueryHandler<GetAuditLogsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAuditLogsQuery): Promise<PaginatedAuditLogs> {
    const {
      tenantId,
      entityType,
      entityId,
      actorId,
      action,
      from,
      to,
      page,
      limit,
    } = query;

    const where = {
      tenantId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(actorId && { actorId }),
      ...(action && { action }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
