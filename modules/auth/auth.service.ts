// import {
//   BadRequestException,
//   ConflictException,
//   Injectable,
//   NotFoundException,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { RegisterDto } from './dto/register.dto';
// import { RegisterTenantDto } from './dto/register-tenant.dto';
// import { ChangePasswordDto } from './dto/change-password.dto';
// import { PrismaService } from '@infra/database/prisma/prisma.service';
// import { TenantService } from 'src/tenant/tenant.service';
// import { MailService } from 'src/mail/mail.service';
// import { Role } from '@prisma/client';
// import * as bcrypt from 'bcrypt';
// import { LoginDto } from './dto/login.dto';
// import { JwtService } from '@nestjs/jwt';
// import { v4 as uuidv4 } from 'uuid';

// @Injectable()
// export class AuthService {
//   constructor(
//     private readonly prismaService: PrismaService,
//     private readonly tenantService: TenantService,
//     private readonly jwtService: JwtService,
//     private readonly mailService: MailService,
//   ) {}

//   // REGISTER  (Company + HR Admin)

//   async registerTenant(dto: RegisterTenantDto) {
//     // 1. Check company name is not already taken (name is not @unique, so use findFirst)
//     const existingTenant = await this.prismaService.tenant.findFirst({
//       where: { name: dto.companyName },
//     });
//     if (existingTenant) {
//       throw new ConflictException('A company with this name already exists');
//     }

//     // 2. Check email is not already taken across all users
//     const existingEmail = await this.prismaService.user.findFirst({
//       where: { email: dto.email },
//     });
//     if (existingEmail) {
//       throw new ConflictException(
//         'A user with this email already exists in a company',
//       );
//     }

//     // const slug = dto.companyName
//     //   .toLowerCase()
//     //   .trim()
//     //   .replace(/[^a-z0-9\s-]/g, '')
//     //   .replace(/\s+/g, '-');

//     // 4. Generate and hash temp password
//     const tempPassword = Math.random().toString(36).slice(-8) + 'A@1';
//     const hashedPassword = await bcrypt.hash(tempPassword, 10);

//     // 5. Create tenant + HR Admin in one transaction
//     const tenant = await this.prismaService.tenant.create({
//       data: {
//         name: dto.companyName,
//         // slug,
//         companyType: dto.companyType,
//         companyPhone: dto.companyPhone,
//         companyLocation: dto.companyLocation,
//         users: {
//           create: {
//             email: dto.email,
//             password: hashedPassword,
//             firstName: dto.firstName,
//             lastName: dto.lastName,
//             role: Role.TENANT_ADMIN,
//             mustChangePassword: true,
//           },
//         },
//       },
//       include: { users: true },
//     });

//     const hrAdmin = tenant.users[0];

//     // 6. Send welcome email with temp password
//     this.mailService.sendTenantWelcomeEmail(
//       dto.email,
//       dto.firstName,
//       dto.companyName,
//       tempPassword,
//     );

//     // 7. Generate tokens
//     const tokens = await this.generateUserToken({
//       userId: hrAdmin.id,
//       email: hrAdmin.email,
//       role: hrAdmin.role,
//       tenantId: tenant.id,
//     });

//     const { password, ...hrAdminWithoutPassword } = hrAdmin;

//     return {
//       message:
//         'Company registered successfully. Check your email for login credentials.',
//       tenant: {
//         id: tenant.id,
//         name: tenant.name,
//       },
//       user: hrAdminWithoutPassword,
//       ...tokens,
//     };
//   }

//   // REGISTER (Add individual user to company )

//   async register(dto: RegisterDto, tenantId: string) {
//     // 1. Verify tenant exists
//     const tenant = await this.prismaService.tenant.findUnique({
//       where: { id: tenantId },
//     });
//     if (!tenant) {
//       throw new NotFoundException('Company not found');
//     }

//     // 2. Age check — must be 18 or above
//     if (dto.dateOfBirth) {
//       const dob = new Date(dto.dateOfBirth);
//       const today = new Date();
//       const age = today.getFullYear() - dob.getFullYear();
//       const hasHadBirthdayThisYear =
//         today.getMonth() > dob.getMonth() ||
//         (today.getMonth() === dob.getMonth() &&
//           today.getDate() >= dob.getDate());
//       const actualAge = hasHadBirthdayThisYear ? age : age - 1;

//       if (actualAge < 18) {
//         throw new BadRequestException(
//           'User must be at least 18 years old to be registered',
//         );
//       }
//     }

//     // 3. Verify department exists and belongs to this tenant
//     const department = await this.prismaService.department.findFirst({
//       where: {
//         id: dto.departmentId,
//         tenantId,
//       },
//     });
//     if (!department) {
//       throw new NotFoundException(
//         'Department not found. Please create a department before adding users',
//       );
//     }

//     // 4. Check if email already exists within this tenant
//     const existingUser = await this.prismaService.user.findFirst({
//       where: { email: dto.email, tenantId },
//     });
//     if (existingUser) {
//       throw new ConflictException(
//         'A user with this email already exists in this company',
//       );
//     }

//     // 5. Generate and hash temp password
//     const tempPassword = Math.random().toString(36).slice(-8) + 'A@1';
//     const hashedPassword = await bcrypt.hash(tempPassword, 10);

//     // 6. Create user scoped to this tenant
//     const user = await this.prismaService.user.create({
//       data: {
//         email: dto.email,
//         password: hashedPassword,
//         firstName: dto.firstName,
//         lastName: dto.lastName,
//         contact: dto.contact ?? null,
//         houseAddress: dto.houseAddress ?? null,
//         dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
//         role: dto.role,
//         departmentId: dto.departmentId,
//         tenantId,
//         mustChangePassword: true,
//       },
//     });

//     // 7. Send welcome email
//     this.mailService.sendUserWelcomeEmail(
//       dto.email,
//       dto.firstName,
//       tenant.name,
//       tempPassword,
//       dto.email,
//     );

//     const { password, ...userWithoutPassword } = user;

//     return {
//       message:
//         'User account created successfully. Login credentials sent to their email.',
//       user: userWithoutPassword,
//     };
//   }

//   // LOGIN

//   async login(dto: LoginDto) {
//     const user = await this.prismaService.user.findFirst({
//       where: { email: dto.email },
//     });

//     if (!user) {
//       throw new UnauthorizedException('Invalid Credentials');
//     }

//     const passwordMatch = await bcrypt.compare(dto.password, user.password);
//     if (!passwordMatch) {
//       throw new UnauthorizedException('Invalid Credentials');
//     }

//     const { password, ...userWithoutPassword } = user;

//     const tokens = await this.generateUserToken({
//       userId: user.id,
//       email: user.email,
//       role: user.role,
//       tenantId: user.tenantId,
//     });

//     return {
//       user: userWithoutPassword,
//       message: 'Successfully logged in',
//       ...tokens,
//     };
//   }

//   // LOGOUT

//   async logout(refreshToken: string) {
//     const token = await this.prismaService.refreshToken.findUnique({
//       where: { token: refreshToken },
//     });

//     if (!token) {
//       throw new UnauthorizedException('Invalid refresh token');
//     }

//     await this.prismaService.refreshToken.delete({
//       where: { id: token.id },
//     });

//     return { message: 'Successfully logged out' };
//   }

//   // CHANGE PASSWORD

//   async changePassword(email: string, dto: ChangePasswordDto) {
//     const user = await this.prismaService.user.findFirst({
//       where: { email },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     const passwordMatch = await bcrypt.compare(dto.oldPassword, user.password);
//     if (!passwordMatch) throw new UnauthorizedException('Invalid old password');

//     const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

//     await this.prismaService.user.update({
//       where: { id: user.id },
//       data: {
//         password: hashedPassword,
//         mustChangePassword: false,
//         passwordResetToken: null,
//       },
//     });

//     return { message: 'Password changed successfully' };
//   }

//   // FORGOT PASSWORD

//   async forgotPassword(email: string) {
//     const user = await this.prismaService.user.findFirst({
//       where: { email },
//     });

//     if (!user) {
//       return { message: 'If this email exists, a reset link has been sent' };
//     }

//     const resetToken = uuidv4();

//     await this.prismaService.user.update({
//       where: { id: user.id },
//       data: { passwordResetToken: resetToken },
//     });

//     this.mailService.sendPasswordResetEmail(
//       user.email,
//       user.firstName,
//       resetToken,
//     );

//     return { message: 'If this email exists, a reset link has been sent' };
//   }

//   // RESET PASSWORD

//   async resetPassword(resetToken: string, newPassword: string) {
//     const user = await this.prismaService.user.findFirst({
//       where: { passwordResetToken: resetToken },
//     });

//     if (!user) {
//       throw new NotFoundException('Invalid or expired reset token');
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     await this.prismaService.user.update({
//       where: { id: user.id },
//       data: {
//         password: hashedPassword,
//         passwordResetToken: null,
//         mustChangePassword: false,
//       },
//     });

//     return { message: 'Password reset successfully. You can now log in.' };
//   }

//   // TOKENS

//   async generateUserToken(payload: {
//     userId: string;
//     email: string;
//     role: Role;
//     tenantId: string;
//   }) {
//     const accessToken = this.jwtService.sign(payload);
//     const refreshToken = uuidv4();

//     await this.prismaService.refreshToken.create({
//       data: {
//         token: refreshToken,
//         userId: payload.userId,
//         expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//       },
//     });

//     return { accessToken, refreshToken };
//   }

//   async refreshToken(refreshToken: string) {
//     const token = await this.prismaService.refreshToken.findUnique({
//       where: { token: refreshToken },
//     });

//     if (!token) {
//       throw new UnauthorizedException('Invalid refresh token');
//     }

//     if (token.expiresAt < new Date()) {
//       await this.prismaService.refreshToken.delete({
//         where: { id: token.id },
//       });
//       throw new UnauthorizedException(
//         'Refresh token expired, please log in again',
//       );
//     }

//     const user = await this.prismaService.user.findUnique({
//       where: { id: token.userId },
//     });

//     if (!user) {
//       throw new UnauthorizedException('User not found');
//     }

//     await this.prismaService.refreshToken.delete({
//       where: { id: token.id },
//     });

//     return this.generateUserToken({
//       userId: user.id,
//       email: user.email,
//       role: user.role,
//       tenantId: user.tenantId,
//     });
//   }
// }
