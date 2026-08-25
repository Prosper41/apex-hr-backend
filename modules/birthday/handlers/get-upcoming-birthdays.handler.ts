import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUpcomingBirthdaysQuery } from '../queries/get-upcoming-birthdays.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';

export interface UpcomingBirthdayUser {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  tenantId: string;
  daysUntil: number;
  isToday: boolean;
}

@QueryHandler(GetUpcomingBirthdaysQuery)
export class GetUpcomingBirthdaysHandler implements IQueryHandler<GetUpcomingBirthdaysQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    tenantId,
    today,
    windowDays,
  }: GetUpcomingBirthdaysQuery): Promise<UpcomingBirthdayUser[]> {
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
        tenantId: true,
      },
    });

    // Normalize today to midnight so date comparisons are day-only
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);

    const inWindow = new Date(todayMidnight);
    inWindow.setDate(todayMidnight.getDate() + windowDays);

    const results: UpcomingBirthdayUser[] = [];

    for (const user of users) {
      const dob = new Date(user.dateOfBirth!);
      const birthdayThisYear = new Date(
        todayMidnight.getFullYear(),
        dob.getMonth(),
        dob.getDate(),
      );

      // If birthday already passed this year, check next year
      if (birthdayThisYear < todayMidnight) {
        birthdayThisYear.setFullYear(todayMidnight.getFullYear() + 1);
      }

      if (birthdayThisYear >= todayMidnight && birthdayThisYear <= inWindow) {
        const daysUntil = Math.ceil(
          (birthdayThisYear.getTime() - todayMidnight.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        results.push({
          ...user,
          dateOfBirth: user.dateOfBirth!,
          daysUntil,
          isToday: daysUntil === 0,
        });
      }
    }

    return results;
  }
}
