import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';

import { GetDepartmentTodayQuery } from './queries/get-department-today.query';
import { DepartmentTodayResponseDto } from './dto/department-today-response.dto';
import type { RequestWithUser } from 'modules/auth/dto/interfaces/request-with-user.interfaces';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/department-today')
export class DepartmentTodayController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: "Get today's absences by department",
    description:
      'Returns how many employees are absent today in each department, tenant-wide.',
  })
  @ApiOkResponse({
    description:
      "Per-department absent counts for today, for the authenticated user's tenant",
    type: DepartmentTodayResponseDto,
  })
  async getDepartmentToday(
    @Req() req: RequestWithUser,
  ): Promise<DepartmentTodayResponseDto> {
    return this.queryBus.execute(
      new GetDepartmentTodayQuery(req.user.tenantId),
    );
  }
}
