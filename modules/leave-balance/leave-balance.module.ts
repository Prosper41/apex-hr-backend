import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infra/database/prisma/prisma.module';

import { LeaveBalanceController } from './leave-balance.controller';
import { GetMyLeaveBalancesHandler } from './queries/handlers/get-my-leave-balances.handler';
import { AuthModule } from 'modules/auth/auth.module';
import { ReserveLeaveBalanceHandler } from './commands/handlers/reserve-leave-balance.handler';
import { ConfirmLeaveDeductionHandler } from './commands/handlers/confirm-leave-deduction.handler';
import { ReleaseLeaveBalanceHandler } from './commands/handlers/release-leave-balance.handler';

export const QueryHandlers = [GetMyLeaveBalancesHandler];

export const CommandHandlers = [
  ReserveLeaveBalanceHandler,
  ConfirmLeaveDeductionHandler,
  ReleaseLeaveBalanceHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, AuthModule],
  controllers: [LeaveBalanceController],
  providers: [...QueryHandlers, ...CommandHandlers],
})
export class LeaveBalanceModule {}
