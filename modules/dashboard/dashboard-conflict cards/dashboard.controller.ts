import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../packages/common/guards/auth.guard';

import { GetDashboardStatsQuery } from './queries/get-dashboard-stats.query';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import type { RequestWithUser } from '../../auth/dto/interfaces/request-with-user.interfaces';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard stats',
    description:
      'Returns tenant-wide counts for pending requests, approved (MTD), staff out today, total staff, and department leave conflicts. Not role-scoped — the frontend decides what each role sees.',
  })
  @ApiOkResponse({
    description: "Dashboard stats for the authenticated user's tenant",
    type: DashboardStatsResponseDto,
  })
  async getStats(
    @Req() req: RequestWithUser,
  ): Promise<DashboardStatsResponseDto> {
    return this.queryBus.execute(new GetDashboardStatsQuery(req.user.tenantId));
  }
}
