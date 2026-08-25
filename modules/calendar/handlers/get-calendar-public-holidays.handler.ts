import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCalendarPublicHolidaysQuery } from '../queries/get-calendar-public-holidays.query';
import { GhanaPublicHolidaysService } from '../ghana-public-holidays.service';

@QueryHandler(GetCalendarPublicHolidaysQuery)
export class GetCalendarPublicHolidaysHandler implements IQueryHandler<GetCalendarPublicHolidaysQuery> {
  constructor(private readonly holidays: GhanaPublicHolidaysService) {}

  async execute({ month, year }: GetCalendarPublicHolidaysQuery) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.holidays.getForMonth(month, year).map((h) => {
      const holidayDate = new Date(h.date);
      const daysUntil = Math.ceil(
        (holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        name: h.name,
        date: h.date,
        daysUntil,
        isPast: daysUntil < 0,
        isToday: daysUntil === 0,
        isUpcoming: daysUntil > 0,
      };
    });
  }
}
