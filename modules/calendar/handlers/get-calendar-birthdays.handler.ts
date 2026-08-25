import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCalendarBirthdaysQuery } from '../queries/get-calendar-birthdays.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@QueryHandler(GetCalendarBirthdaysQuery)
export class GetCalendarBirthdaysHandler implements IQueryHandler<GetCalendarBirthdaysQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ tenantId, month, year }: GetCalendarBirthdaysQuery) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        dateOfBirth: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        role: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return users
      .filter((u) => {
        const dob = new Date(u.dateOfBirth!);
        return dob.getMonth() + 1 === month;
      })
      .map((u) => {
        const dob = new Date(u.dateOfBirth!);
        const birthdayThisYear = new Date(year, dob.getMonth(), dob.getDate());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil(
          (birthdayThisYear.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          initials: `${u.firstName[0]}${u.lastName[0]}`.toUpperCase(),
          dateOfBirth: u.dateOfBirth!.toISOString().slice(0, 10),
          birthdayDate: birthdayThisYear.toISOString().slice(0, 10),
          daysUntil,
          isToday: daysUntil === 0,
          department: u.department,
          role: true,
        };
      })
      .sort((a, b) => {
        const da = new Date(a.birthdayDate);
        const db = new Date(b.birthdayDate);
        return da.getTime() - db.getTime();
      });
  }
}
