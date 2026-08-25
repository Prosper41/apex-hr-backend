import { JsonValue } from '@prisma/client/runtime/library';
import { AuditAction } from './audit-action.enum';

export interface AuditContext {
  tenantId: string;
  actorId: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: JsonValue | null;
  after?: JsonValue | null;
  metadata?: JsonValue | null;
}
