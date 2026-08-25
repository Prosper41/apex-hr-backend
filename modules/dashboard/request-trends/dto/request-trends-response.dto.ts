import { ApiProperty } from '@nestjs/swagger';

export class MonthlyTrendPointDto {
  @ApiProperty({ description: 'Short month label', example: 'Jan' })
  month: string;

  @ApiProperty({ description: 'Full year for this point', example: 2026 })
  year: number;

  @ApiProperty({
    description: 'Approved leave requests in this month (tenant-wide)',
    example: 9,
  })
  approved: number;

  @ApiProperty({
    description: 'Rejected leave requests in this month (tenant-wide)',
    example: 2,
  })
  rejected: number;
}

export class RequestTrendsResponseDto {
  @ApiProperty({ type: [MonthlyTrendPointDto] })
  points: MonthlyTrendPointDto[];
}
