import { Module } from '@nestjs/common';

import { LeavePolicyController } from './leave-policy.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UpdateLeavePolicyHandler } from './cqrs/handlers/update-leave-policy.handler';
import { CreateLeavePolicyHandler } from './cqrs/handlers/create-leave-policy.handler';
import { RemoveLeavePolicyHandler } from './cqrs/handlers/remove-leave-policy.handler';
import { ToggleActiveLeavePolicyHandler } from './cqrs/handlers/toggle-active-leave-policy.handler';
import { GetAllLeavePoliciesHandler } from './cqrs/handlers/get-all-leave-policies.handler';
import { GetLeavePoliciesForUserHandler } from './cqrs/handlers/get-leave-policies-for-user.handler';
import { GetLeavePolicyByIdHandler } from './cqrs/handlers/get-leave-policy-by-id.handler';
import { LeavePolicyHelper } from './cqrs/leave-policy.helper';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infra/database/prisma/prisma.module';

export const CommandHandlers = [
  CreateLeavePolicyHandler,
  UpdateLeavePolicyHandler,
  RemoveLeavePolicyHandler,
  ToggleActiveLeavePolicyHandler,
];

export const QueryHandlers = [
  GetAllLeavePoliciesHandler,
  GetLeavePolicyByIdHandler,
  GetLeavePoliciesForUserHandler,
];

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [LeavePolicyController],
  providers: [LeavePolicyHelper, ...CommandHandlers, ...QueryHandlers],
})
export class LeavePolicyModule {}
