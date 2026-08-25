import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';

import { GetUpcomingAbsencesQuery } from './queries/get-upcoming-absences.query';
import { UpcomingAbsencesResponseDto } from './dto/upcoming-absences-response.dto';
import type { RequestWithUser } from 'modules/auth/dto/interfaces/request-with-user.interfaces';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/upcoming-absences')
export class UpcomingAbsencesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'Get upcoming absences',
    description:
      'Returns approved leave requests starting in the next 7 days, tenant-wide across all departments.',
  })
  @ApiOkResponse({
    description: "Upcoming absences for the authenticated user's tenant",
    type: UpcomingAbsencesResponseDto,
  })
  async getUpcomingAbsences(
    @Req() req: RequestWithUser,
  ): Promise<UpcomingAbsencesResponseDto> {
    return this.queryBus.execute(
      new GetUpcomingAbsencesQuery(req.user.tenantId),
    );
  }
}
