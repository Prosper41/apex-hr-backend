import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { GetAuditLogByIdQuery } from '../get-audit-log-by-id.query';
import { AuditLogEntry } from './get-audit-logs.handler';

@QueryHandler(GetAuditLogByIdQuery)
export class GetAuditLogByIdHandler implements IQueryHandler<GetAuditLogByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAuditLogByIdQuery): Promise<AuditLogEntry> {
    const entry = await this.prisma.auditLog.findFirst({
      where: {
        id: query.id,
        tenantId: query.tenantId,
      },
    });

    if (!entry) {
      throw new NotFoundException(`Audit log entry ${query.id} not found`);
    }

    return entry;
  }
}
