import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import {
  passwordResetTemplate,
  tenantWelcomeTemplate,
  userWelcomeTemplate,
  leaveNotificationTemplate,
} from './templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: true,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendTenantWelcomeEmail(
    to: string,
    firstName: string,
    tenantName: string,
    tempPassword: string,
  ) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://apex-hr-gray.vercel.app',
    );
    const loginLink = `${frontendUrl}/login`;
    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: `Welcome to ApexHR — ${tenantName}`,
      html: tenantWelcomeTemplate(
        firstName,
        tenantName,
        tempPassword,
        loginLink,
      ),
    });
  }

  async sendUserWelcomeEmail(
    to: string,
    firstName: string,
    tenantName: string,
    tempPassword: string,
    email: string,
  ) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://apex-hr-gray.vercel.app',
    );
    const loginLink = `${frontendUrl}/login`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: `Welcome to ApexHR — ${firstName}`,
      html: userWelcomeTemplate(
        loginLink,
        firstName,
        tenantName,
        tempPassword,
        email,
      ),
    });
  }

  async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetToken: string,
  ) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://apex-hr-gray.vercel.app',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'ApexHR — Password Reset Request',
      html: passwordResetTemplate(firstName, resetLink),
    });
  }

  async sendLeaveNotificationEmail(
    to: string,
    subject: string,
    message: string,
    leaveRequestId?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://apex-hr-gray.vercel.app',
    );
    const viewLink = leaveRequestId
      ? `${frontendUrl}/approvals?requestId=${leaveRequestId}`
      : frontendUrl;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject,
        text: message,
        html: leaveNotificationTemplate(subject, message, viewLink),
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${String(err)}`);
    }
  }
}
