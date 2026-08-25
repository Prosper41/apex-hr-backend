import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { GetCalendarLeaveRequestsQuery } from './queries/get-calendar-leave-requests.query';
import { GetCalendarBirthdaysQuery } from './queries/get-calendar-birthdays.query';
import { GetCalendarPublicHolidaysQuery } from './queries/get-calendar-public-holidays.query';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('leave-requests')
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({ summary: 'Get leave requests for the calendar view' })
  getLeaveRequests(
    @Query() query: CalendarQueryDto,
    @Req() req: Request & { user: any },
  ) {
    const { tenantId, departmentId, role } = req.user;
    const scopedDepartmentId =
      role === Role.HR_ADMIN || role === Role.TENANT_ADMIN
        ? undefined
        : departmentId;

    return this.queryBus.execute(
      new GetCalendarLeaveRequestsQuery(
        tenantId,
        scopedDepartmentId,
        role,
        query.month,
        query.year,
      ),
    );
  }

  @Get('birthdays')
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({ summary: 'Get birthdays for the calendar view' })
  getBirthdays(
    @Query() query: CalendarQueryDto,
    @Req() req: Request & { user: any },
  ) {
    return this.queryBus.execute(
      new GetCalendarBirthdaysQuery(req.user.tenantId, query.month, query.year),
    );
  }

  @Get('public-holidays')
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({ summary: 'Get Ghana public holidays for the calendar view' })
  getPublicHolidays(@Query() query: CalendarQueryDto) {
    return this.queryBus.execute(
      new GetCalendarPublicHolidaysQuery(query.month, query.year),
    );
  }
}
