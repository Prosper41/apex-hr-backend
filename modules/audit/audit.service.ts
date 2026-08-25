import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { AuditContext } from './interfaces/audit-context.interface';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an audit entry INSIDE an existing Prisma transaction.
   * Use this so the audit row and the business change commit atomically.
   */
  async logTx(tx: Prisma.TransactionClient, ctx: AuditContext): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        action: ctx.action,
        actorId: ctx.actorId,
        actorRole: ctx.actorRole,
        before: ctx.before ?? Prisma.JsonNull,
        after: ctx.after ?? Prisma.JsonNull,
        metadata: ctx.metadata ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Write an audit entry OUTSIDE a transaction.
   * Swallows errors so a logging failure never crashes a business operation.
   */
  async log(ctx: AuditContext): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          entityType: ctx.entityType,
          entityId: ctx.entityId,
          action: ctx.action,
          actorId: ctx.actorId,
          actorRole: ctx.actorRole,
          before: ctx.before ?? Prisma.JsonNull,
          after: ctx.after ?? Prisma.JsonNull,
          metadata: ctx.metadata ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }
}
