import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@infra/database/prisma/prisma.module';
import { GetUsersByNameHandler } from './cqrs/handlers/get-users-by-name.handler';
import { GetUserByEmailHandler } from './cqrs/handlers/get-user-by-email.handler';
import { GetAllUsersHandler } from './cqrs/handlers/get-all-users.handler';
import { RemoveUserHandler } from './cqrs/handlers/remove-user.handler';
import { CqrsModule } from '@nestjs/cqrs';
import { UpdateUserHandler } from './cqrs/handlers/update-user.handler';
import { BirthdayModule } from '../birthday/birthday.module';

export const CommandHandlers = [RemoveUserHandler, UpdateUserHandler];
export const QueryHandlers = [
  GetAllUsersHandler,
  GetUserByEmailHandler,
  GetUsersByNameHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, JwtModule, BirthdayModule],
  controllers: [UsersController],
  providers: [...QueryHandlers, ...CommandHandlers],
})
export class UsersModule {}
