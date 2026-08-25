import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveRequestStatus } from '@prisma/client';
import { GetUpcomingAbsencesQuery } from '../get-upcoming-absences.query';
import {
  UpcomingAbsenceItemDto,
  UpcomingAbsencesResponseDto,
} from '../../dto/upcoming-absences-response.dto';

@QueryHandler(GetUpcomingAbsencesQuery)
export class GetUpcomingAbsencesHandler implements IQueryHandler<GetUpcomingAbsencesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetUpcomingAbsencesQuery,
  ): Promise<UpcomingAbsencesResponseDto> {
    const tenantId = query.tenantId;

    const startOfTomorrow = this.getStartOfTomorrow();
    const endOfSeventhDay = this.getEndOfSeventhDayFromNow();

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { gte: startOfTomorrow, lte: endOfSeventhDay },
      },
      select: {
        startDate: true,
        endDate: true,
        user: {
          select: { firstName: true, lastName: true },
        },
        leavePolicy: {
          select: { type: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const absences: UpcomingAbsenceItemDto[] = leaveRequests.map((request) => ({
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      leaveType: request.leavePolicy.type,
      startDate: request.startDate,
      endDate: request.endDate,
    }));

    return { absences, totalUpcoming: absences.length };
  }

  /**
   * Tomorrow at midnight — "upcoming" means not started yet, so today's
   * absences are excluded here (they belong on the "Out Today" card).
   */
  private getStartOfTomorrow(): Date {
    const startOfTomorrow = new Date();
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);
    return startOfTomorrow;
  }

  /**
   * End of the 7th day from today — the outer edge of the "next 7 days"
   * window.
   */
  private getEndOfSeventhDayFromNow(): Date {
    const endOfSeventhDay = new Date();
    endOfSeventhDay.setDate(endOfSeventhDay.getDate() + 7);
    endOfSeventhDay.setHours(23, 59, 59, 999);
    return endOfSeventhDay;
  }
}
