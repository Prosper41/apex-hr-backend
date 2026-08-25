import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { MailService } from '@infra/mail/mail.service';
import { RegisterUserCommand } from '../command/register-user.command';
import { assertMinimumAge } from '@common/utils/age.util';
import * as bcrypt from 'bcrypt';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async execute({ dto, tenantId }: RegisterUserCommand): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Company not found');

    if (dto.dateOfBirth) assertMinimumAge(dto.dateOfBirth);

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });
    if (existingUser) {
      if (existingUser.offboardedAt) {
        throw new ConflictException({
          message:
            'A user with this email was previously offboarded. Please contact support to reactivate the account.',
          code: 'USER_SOFT_DELETED',
          userId: existingUser.id,
        });
      }
      throw new ConflictException('A user with this email already exists');
    }

    const tempPassword = Math.random().toString(36).slice(-8) + 'A@1';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          contact: dto.contact ?? null,
          houseAddress: dto.houseAddress ?? null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          role: dto.role,
          departmentId: dto.departmentId,
          tenantId,
          mustChangePassword: true,
          ...(dto.joinedAt
            ? { joinedAt: new Date(dto.joinedAt) }
            : {}),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }
      throw err;
    }

    this.mailService.sendUserWelcomeEmail(
      dto.email,
      dto.firstName,
      tenant.name,
      tempPassword,
      dto.email,
    );

    const { password, ...userWithoutPassword } = user;

    return {
      message:
        'User registered successfully. Temporary password sent to email.',
      userWithoutPassword,
    };
  }
}
