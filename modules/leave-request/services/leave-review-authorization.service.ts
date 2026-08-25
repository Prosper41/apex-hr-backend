import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';

const APPROVER_ROLES: Role[] = [
  Role.TEAM_LEAD,
  Role.DEPT_HEAD,
  Role.HR_ADMIN,
  Role.TENANT_ADMIN,
];

@Injectable()
export class LeaveReviewAuthorizationService {
  private readonly logger = new Logger(LeaveReviewAuthorizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Throws if `actorId` is not the required approver for the CURRENT stage. */
  async assertCanAct(params: {
    actorId: string;
    tenantId: string;
    departmentId: string;
    requiredRole: Role;
  }) {
    const actor = await this.prisma.user.findUnique({
      where: { id: params.actorId },
    });
    if (!actor) throw new NotFoundException('Acting user not found');

    if (actor.role !== params.requiredRole) {
      this.logger.warn(
        `User ${actor.id} (${actor.role}) attempted action requiring ${params.requiredRole}`,
      );
      throw new ForbiddenException(
        `This stage requires role ${params.requiredRole}`,
      );
    }
    await this.assertDepartmentOrHrScope(
      actor,
      params.tenantId,
      params.departmentId,
    );
    this.logger.debug(
      `Authorized: ${actor.id} (${actor.role}) may act on this request`,
    );
    return actor;
  }

  /** Looser check for the general comment thread — any approver role with standing over this request, regardless of current stage. */
  async assertCanComment(
    actorId: string,
    tenantId: string,
    departmentId: string,
  ) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) throw new NotFoundException('Acting user not found');
    if (!APPROVER_ROLES.includes(actor.role)) {
      throw new ForbiddenException(
        'You do not have permission to comment on leave requests',
      );
    }
    await this.assertDepartmentOrHrScope(actor, tenantId, departmentId);
    return actor;
  }

  private async assertDepartmentOrHrScope(
    actor: { role: Role; departmentId: string | null },
    tenantId: string,
    departmentId: string,
  ) {
    if (actor.role === Role.TEAM_LEAD || actor.role === Role.DEPT_HEAD) {
      if (actor.departmentId !== departmentId) {
        throw new ForbiddenException(
          'You can only act on requests within your own department',
        );
      }
    }
    if (actor.role === Role.HR_ADMIN) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (actor.departmentId !== tenant?.hrDepartmentId) {
        throw new ForbiddenException(
          'You are not part of the HR department for this tenant',
        );
      }
    }
  }
}
