import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
// import { Throttle } from '@nestjs/throttler';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { AuthGuard } from '../../packages/common/guards/auth.guard';
import { RolesGuard } from '../../packages/common/guards/roles.guard';
import { Roles } from '../../packages/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { CommandBus } from '@nestjs/cqrs';
import { RegisterTenantCommand } from './cqrs/command/register-tenant.command';
import { LoginCommand } from './cqrs/command/login.command';
import { LogoutCommand } from './cqrs/command/logout.command';
import { RefreshTokenCommand } from './cqrs/command/refresh-token.command';
import { ForgotPasswordCommand } from './cqrs/command/forgot-password.command';
import { ResetPasswordCommand } from './cqrs/command/reset-password.command';
import { RegisterUserCommand } from './cqrs/command/register-user.command';
import { ChangePasswordCommand } from './cqrs/command/change-password.command';
import { RestoreUserCommand } from './cqrs/command/restore-user.command';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  //  PUBLIC ROUTES

  // @Throttle({
  //   short: { ttl: 1_000, limit: 0 },
  //   medium: { ttl: 60_000, limit: 0 },
  //   long: { ttl: 3_600_000, limit: 5 },
  // })
  @Post('register-tenant')
  @ApiOperation({
    summary: 'Register a new tenant/company with an HR Admin account',
  })
  @ApiResponse({
    status: 201,
    description:
      'Tenant registered and temporary password sent to HR Admin email',
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant slug or email already exists',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  registerTenant(@Body() registerTenantDto: RegisterTenantDto) {
    return this.commandBus.execute(
      new RegisterTenantCommand(registerTenantDto),
    );
  }

  // @Throttle({
  //   short: { ttl: 1_000, limit: 0 },
  //   medium: { ttl: 60_000, limit: 5 },
  //   long: { ttl: 3_600_000, limit: 0 },
  // })
  @Post('login')
  @ApiOperation({ summary: 'Login with email, password and tenant slug' })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access and refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  login(@Body() loginDto: LoginDto) {
    return this.commandBus.execute(new LoginCommand(loginDto));
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate the refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  logout(@Body('refreshToken') refreshToken: string) {
    return this.commandBus.execute(new LogoutCommand(refreshToken));
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Obtain a new access token using a refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns a new access token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.commandBus.execute(new RefreshTokenCommand(refreshToken));
  }

  // @Throttle({
  //   short: { ttl: 1_000, limit: 0 },
  //   medium: { ttl: 60_000, limit: 0 },
  //   long: { ttl: 3_600_000, limit: 5 },
  // })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.commandBus.execute(new ForgotPasswordCommand(dto.email));
  }

  // @Throttle({
  //   short: { ttl: 1_000, limit: 0 },
  //   medium: { ttl: 60_000, limit: 0 },
  //   long: { ttl: 3_600_000, limit: 5 },
  // })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token received via email' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resetToken', 'newPassword'],
      properties: {
        resetToken: {
          type: 'string',
          example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        },
        newPassword: {
          type: 'string',
          example: 'NewSecret@123',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'Invalid or expired reset token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  resetPassword(
    @Body('resetToken') resetToken: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.commandBus.execute(
      new ResetPasswordCommand(resetToken, newPassword),
    );
  }

  //  PROTECTED ROUTES

  @Post('register')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new employee under an existing tenant (HR Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Employee registered successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({
    status: 409,
    description: 'Email already exists under this tenant',
  })
  register(@Body() registerDto: RegisterDto, @Req() req: any) {
    return this.commandBus.execute(
      new RegisterUserCommand(registerDto, req.user.tenantId),
    );
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the authenticated user's password" })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @ApiResponse({ status: 404, description: 'User not found' })
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.commandBus.execute(
      new ChangePasswordCommand(req.user.userId, changePasswordDto),
    );
  }

  @Post(':id/restore')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Restore deleted user',
  })
  @ApiParam({
    name: 'id',
    description: 'User id',
    example: 'cm123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
  })
  restoreUser(@Param('id') id: string, @Req() req: any) {
    return this.commandBus.execute(
      new RestoreUserCommand(id, req.user.tenantId),
    );
  }
}
