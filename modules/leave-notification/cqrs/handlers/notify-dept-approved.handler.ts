import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { NotifyDeptApprovedCommand } from '../commands/notify-dept-approved.command';
import { LeaveNotificationDispatcher } from '../../leave-notification-dispatcher.service';
import { PrismaService } from '@infra/database/prisma/prisma.service';

// Derived from the class method itself rather than `typeof this.dispatcher...`,
// since referencing `this` in a type position inside a method body doesn't
// reliably resolve under `nest build` (TS2304: Cannot find name 'this').
type Recipients = Awaited<
  ReturnType<LeaveNotificationDispatcher['findRecipients']>
>;

@CommandHandler(NotifyDeptApprovedCommand)
export class NotifyDeptApprovedHandler implements ICommandHandler<NotifyDeptApprovedCommand> {
  private readonly logger = new Logger(NotifyDeptApprovedHandler.name);

  constructor(
    private readonly dispatcher: LeaveNotificationDispatcher,
    private readonly prisma: PrismaService,
  ) {}

  async execute({ leaveRequestId, tenantId }: NotifyDeptApprovedCommand) {
    this.logger.debug(
      `Executing -> leaveRequestId=${leaveRequestId}, tenantId=${tenantId}`,
    );

    const leaveRequest =
      await this.dispatcher.fetchLeaveRequest(leaveRequestId);

    if (!leaveRequest) {
      this.logger.warn(
        `Aborting -> leaveRequestId=${leaveRequestId} not found, no notification sent`,
      );
      return;
    }

    // ── Special case: the requester IS the HR Admin ─────────────────────
    // They cannot approve their own request, so TENANT_ADMIN is notified
    // instead of HR_ADMIN for this one request only.
    const requester = await this.prisma.user.findUnique({
      where: { id: leaveRequest.userId },
      select: { role: true },
    });

    if (requester?.role === 'HR_ADMIN') {
      let tenantAdmins: Recipients = [];
      try {
        tenantAdmins = await this.dispatcher.findRecipients({
          tenantId,
          role: 'TENANT_ADMIN',
        });
      } catch (err) {
        this.logger.error(
          `findRecipients (TENANT_ADMIN, HR self-request) FAILED for leaveRequestId=${leaveRequestId}`,
          err instanceof Error ? err.stack : err,
        );
        throw err;
      }

      if (tenantAdmins.length === 0) {
        this.logger.warn(
          `HR self-request but no TENANT_ADMIN found for tenantId=${tenantId} — no notification sent.`,
        );
        return;
      }

      this.logger.debug(
        `Notifying TENANT_ADMIN (HR self-request) -> leaveRequestId=${leaveRequestId}, recipientCount=${tenantAdmins.length}`,
      );

      await this.dispatcher.notifyAll(
        tenantAdmins,
        leaveRequest,
        'approved by the Department Head and is awaiting your final approval (submitted by HR)',
      );
      this.logger.debug(
        `Completed (HR self-request) -> leaveRequestId=${leaveRequestId}`,
      );
      return;
    }

    // ── Standard case: look up the tenant's designated HR department ────
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { hrDepartmentId: true },
    });

    if (!tenant?.hrDepartmentId) {
      // Intentionally NOT notifying TENANT_ADMIN as a fallback — the HR
      // stage is reserved for HR_ADMIN only. If no HR department is
      // configured for this tenant, no one is notified and the request
      // will stall at DEPT_APPROVED until the tenant is configured
      // correctly. This is a visible, actionable gap rather than a
      // silent handoff to the wrong role.
      this.logger.warn(
        `No HR department configured for tenantId=${tenantId} — no HR notification sent. This tenant needs hrDepartmentId set.`,
      );
      return;
    }

    let hrRecipients: Recipients = [];
    try {
      hrRecipients = await this.dispatcher.findRecipients({
        tenantId,
        departmentId: tenant.hrDepartmentId,
        role: 'HR_ADMIN',
      });
      this.logger.debug(
        `hrRecipients lookup succeeded, count=${hrRecipients.length}`,
      );
    } catch (err) {
      this.logger.error(
        `findRecipients (HR_ADMIN) FAILED for leaveRequestId=${leaveRequestId}, hrDepartmentId=${tenant.hrDepartmentId}`,
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }

    if (hrRecipients.length === 0) {
      this.logger.warn(
        `hrDepartmentId is set (${tenant.hrDepartmentId}) but no HR_ADMIN user found in that department for tenantId=${tenantId} — no notification sent.`,
      );
      return;
    }

    this.logger.debug(
      `Notifying HR_ADMIN only -> leaveRequestId=${leaveRequestId}, hrDepartmentId=${tenant.hrDepartmentId}, recipientCount=${hrRecipients.length}`,
    );

    try {
      await this.dispatcher.notifyAll(
        hrRecipients,
        leaveRequest,
        'approved by the Department Head and is awaiting your final approval',
      );
      this.logger.debug(
        `notifyAll succeeded for leaveRequestId=${leaveRequestId}`,
      );
    } catch (err) {
      this.logger.error(
        `notifyAll FAILED for leaveRequestId=${leaveRequestId}`,
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }

    this.logger.debug(`Completed -> leaveRequestId=${leaveRequestId}`);
  }
}
