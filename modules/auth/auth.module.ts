import { RegisterTenantHandler } from './cqrs/handlers/register-tenant.handler';
import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '@infra/mail/mail.module';
import { PrismaModule } from '@infra/database/prisma/prisma.module';
import { TokenService } from 'modules/auth/token.services';

import { RegisterUserHandler } from './cqrs/handlers/register-user.handler';
import { LoginHandler } from './cqrs/handlers/login.handler';
import { LogoutHandler } from './cqrs/handlers/logout.handler';
import { RefreshTokenHandler } from './cqrs/handlers/refresh-token.handler';
import { ChangePasswordHandler } from './cqrs/handlers/change-password.handler';
import { ForgotPasswordHandler } from './cqrs/handlers/forgot-password.handler';
import { ResetPasswordHandler } from './cqrs/handlers/reset-password.handler';
import { RolesGuard } from '../../packages/common/guards/roles.guard';
import { AuthGuard } from '../../packages/common/guards/auth.guard';

export const CommandHandlers = [
  RegisterTenantHandler,
  RegisterUserHandler,
  LoginHandler,
  LogoutHandler,
  RefreshTokenHandler,
  ChangePasswordHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
];

@Global()
@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    MailModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [TokenService, RolesGuard, AuthGuard, ...CommandHandlers],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
