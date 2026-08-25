// leave-notification-dispatcher.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { MailService } from '@infra/mail/mail.service';
import { CreateNotificationService } from './in-app-notification/create-notification.service';
import { NotificationSourceType } from '@prisma/client';

interface LeaveRequestRecipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class LeaveNotificationDispatcher {
  private readonly logger = new Logger(LeaveNotificationDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly createNotificationService: CreateNotificationService,
  ) {}

  async fetchLeaveRequest(leaveRequestId: string) {
    console.log('fetchLeaveRequest called with id:', leaveRequestId);

    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!leaveRequest) {
      this.logger.warn(
        `Leave request ${leaveRequestId} not found — it may have been deleted before the job ran. Skipping.`,
      );
      return leaveRequest;
    }

    console.log('Found leave request:', leaveRequest.id, leaveRequest.status);

    return leaveRequest;
  }

  async findRecipients(params: {
    tenantId: string;
    departmentId?: string;
    role: string | { in: string[] };
  }): Promise<LeaveRequestRecipient[]> {
    console.log('findRecipients params:', params);

    const recipients = await this.prisma.user.findMany({
      where: {
        tenantId: params.tenantId,
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
        role: params.role as any,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    console.log('Number of recipients found:', recipients.length);
    for (const r of recipients) {
      console.log('  recipient:', r.email);
    }

    return recipients;
  }

  async notifyAll(
    recipients: LeaveRequestRecipient[],
    leaveRequest: {
      id: string;
      tenantId: string;
      user: { firstName: string; lastName: string };
    },
    actionDescription: string,
  ) {
    if (recipients.length === 0) {
      this.logger.warn(
        `No recipients found for leaveRequestId=${leaveRequest.id}, action="${actionDescription}"`,
      );
      return;
    }

    const employeeName = `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`;
    const subject = `Leave Request Update — ${employeeName}`;
    const message = `${employeeName}'s leave request was ${actionDescription}.`;

    console.log('Starting notifyAll for leave request:', leaveRequest.id);
    console.log('Sending to', recipients.length, 'recipients');

    let emailSuccessCount = 0;
    let emailFailCount = 0;
    let inAppSuccessCount = 0;
    let inAppFailCount = 0;

    for (const recipient of recipients) {
      console.log('Processing recipient:', recipient.email);

      try {
        await this.mailService.sendLeaveNotificationEmail(
          recipient.email,
          subject,
          message,
          leaveRequest.id,
        );
        console.log('Email sent OK to', recipient.email);
        emailSuccessCount++;
      } catch (err) {
        console.log('Email FAILED for', recipient.email, 'error:', err);
        this.logger.error(
          `Email failed for ${recipient.email} on leaveRequestId=${leaveRequest.id}`,
        );
        emailFailCount++;
      }

      // try creating the in-app notification
      try {
        await this.createNotificationService.create({
          tenantId: leaveRequest.tenantId,
          userId: recipient.id,
          title: subject,
          message,
          sourceType: NotificationSourceType.LEAVE_REQUEST,
          sourceId: leaveRequest.id,
        });
        console.log('In-app notification created OK for', recipient.id);
        inAppSuccessCount++;
      } catch (err) {
        console.log(
          'In-app notification FAILED for',
          recipient.id,
          'error:',
          err,
        );
        this.logger.error(
          `In-app notification failed for userId=${recipient.id} on leaveRequestId=${leaveRequest.id}`,
        );
        inAppFailCount++;
      }
    }

    console.log('Done with notifyAll. Results:');
    console.log('  emails sent:', emailSuccessCount, 'failed:', emailFailCount);
    console.log('  in-app sent:', inAppSuccessCount, 'failed:', inAppFailCount);

    this.logger.log(
      `Notification dispatch complete -> leaveRequestId=${leaveRequest.id}, emailFailures=${emailFailCount}, inAppFailures=${inAppFailCount}`,
    );
  }

  async notifyEmployee(
    leaveRequest: {
      id: string;
      tenantId: string;
      userId: string;
      user: { firstName: string; lastName: string; email: string };
    },
    actionDescription: string,
  ) {
    console.log('notifyEmployee called for leaveRequestId:', leaveRequest.id);
    console.log('Sending to employee email:', leaveRequest.user.email);

    const employeeName = `${leaveRequest.user.firstName} ${leaveRequest.user.lastName}`;
    const subject = `Your Leave Request Was ${actionDescription}`;
    const message = `Hi ${leaveRequest.user.firstName}, your leave request was ${actionDescription}.`;

    let emailOk = false;
    let inAppOk = false;

    try {
      await this.mailService.sendLeaveNotificationEmail(
        leaveRequest.user.email,
        subject,
        message,
        leaveRequest.id,
      );
      console.log('Employee email sent OK to', leaveRequest.user.email);
      emailOk = true;
    } catch (err) {
      console.log(
        'Employee email FAILED for',
        leaveRequest.user.email,
        'error:',
        err,
      );
      this.logger.error(
        `Employee notification email failed for userId=${leaveRequest.userId} on leaveRequestId=${leaveRequest.id}`,
      );
    }

    try {
      await this.createNotificationService.create({
        tenantId: leaveRequest.tenantId,
        userId: leaveRequest.userId,
        title: subject,
        message,
        sourceType: NotificationSourceType.LEAVE_REQUEST,
        sourceId: leaveRequest.id,
      });
      console.log(
        'Employee in-app notification created OK for',
        leaveRequest.userId,
      );
      inAppOk = true;
    } catch (err) {
      console.log(
        'Employee in-app notification FAILED for',
        leaveRequest.userId,
        'error:',
        err,
      );
      this.logger.error(
        `Employee in-app notification failed for userId=${leaveRequest.userId} on leaveRequestId=${leaveRequest.id}`,
      );
    }

    console.log(
      'notifyEmployee done. email ok?',
      emailOk,
      'in-app ok?',
      inAppOk,
    );

    this.logger.log(
      `Employee notification complete -> leaveRequestId=${leaveRequest.id}, emailOk=${emailOk}, inAppOk=${inAppOk}`,
    );
  }
}
