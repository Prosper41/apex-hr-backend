import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infra/database/prisma/prisma.module';
import { CalendarController } from './calendar.controller';
import { GhanaPublicHolidaysService } from './ghana-public-holidays.service';
import { GetCalendarLeaveRequestsHandler } from './handlers/get-calendar-leave-requests.handler';
import { GetCalendarBirthdaysHandler } from './handlers/get-calendar-birthdays.handler';
import { GetCalendarPublicHolidaysHandler } from './handlers/get-calendar-public-holidays.handler';

export const QueryHandlers = [
  GetCalendarLeaveRequestsHandler,
  GetCalendarBirthdaysHandler,
  GetCalendarPublicHolidaysHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CalendarController],
  providers: [GhanaPublicHolidaysService, ...QueryHandlers],
})
export class CalendarModule {}
