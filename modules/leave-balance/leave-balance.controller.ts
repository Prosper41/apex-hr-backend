import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { QueryBus } from '@nestjs/cqrs';
import { GetMyLeaveBalancesQuery } from './queries/get-my-leave-balances.query';
import { AuthGuard } from '@common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('leave-balance')
export class LeaveBalanceController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('my-balances')
  async getMyBalances(@Req() req: AuthenticatedRequest): Promise<unknown> {
    const result = (await this.queryBus.execute(
      new GetMyLeaveBalancesQuery(req.user.userId, req.user.tenantId),
    )) as unknown;

    return result;
  }
}

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    tenantId: string;
  };
}
