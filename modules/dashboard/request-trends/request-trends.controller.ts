import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../packages/common/guards/auth.guard';
import { GetRequestTrendsQuery } from './queries/get-request-trends.query';
import { RequestTrendsResponseDto } from './dto/request-trends-response.dto';
import type { RequestWithUser } from '../../auth/dto/interfaces/request-with-user.interfaces';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/request-trends')
export class RequestTrendsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'Get monthly request trends',
    description:
      'Returns approved vs rejected leave request counts per month, rolling last 6 months, tenant-wide across all departments.',
  })
  @ApiOkResponse({
    description: "Monthly trend points for the authenticated user's tenant",
    type: RequestTrendsResponseDto,
  })
  async getTrends(
    @Req() req: RequestWithUser,
  ): Promise<RequestTrendsResponseDto> {
    return this.queryBus.execute(new GetRequestTrendsQuery(req.user.tenantId));
  }
}
