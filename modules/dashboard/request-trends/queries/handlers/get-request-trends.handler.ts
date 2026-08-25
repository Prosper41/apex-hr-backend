import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveRequestStatus } from '@prisma/client';
import { GetRequestTrendsQuery } from '../get-request-trends.query';
import {
  MonthlyTrendPointDto,
  RequestTrendsResponseDto,
} from '../../dto/request-trends-response.dto';

interface MonthBucket {
  label: string;
  year: number;
  start: Date;
  end: Date;
}

@QueryHandler(GetRequestTrendsQuery)
export class GetRequestTrendsHandler implements IQueryHandler<GetRequestTrendsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetRequestTrendsQuery,
  ): Promise<RequestTrendsResponseDto> {
    const { tenantId } = query;
    const buckets = this.buildLastSixMonthBuckets();

    const points: MonthlyTrendPointDto[] = await Promise.all(
      buckets.map(async (bucket) => {
        const [approved, rejected] = await Promise.all([
          this.prisma.leaveRequest.count({
            where: {
              tenantId,
              status: LeaveRequestStatus.APPROVED,
              updatedAt: { gte: bucket.start, lte: bucket.end },
            },
          }),
          this.prisma.leaveRequest.count({
            where: {
              tenantId,
              status: LeaveRequestStatus.REJECTED,
              updatedAt: { gte: bucket.start, lte: bucket.end },
            },
          }),
        ]);

        return { month: bucket.label, year: bucket.year, approved, rejected };
      }),
    );

    return { points };
  }

  /**
   * Builds 6 month buckets ending with the current month, oldest first,
   * so the chart draws left-to-right chronologically.
   */
  private buildLastSixMonthBuckets(): MonthBucket[] {
    const now = new Date();
    const buckets: MonthBucket[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      buckets.push({
        label: monthDate.toLocaleString('en-US', { month: 'short' }),
        year: monthDate.getFullYear(),
        start,
        end,
      });
    }

    return buckets;
  }
}
