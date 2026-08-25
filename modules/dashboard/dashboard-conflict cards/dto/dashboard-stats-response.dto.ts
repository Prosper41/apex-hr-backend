import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsResponseDto {
  @ApiProperty({
    description:
      'Leave requests currently pending at any approval stage (tenant-wide)',
    example: 5,
  })
  pendingRequests: number;

  @ApiProperty({
    description: 'Leave requests approved this month (tenant-wide)',
    example: 9,
  })
  approvedMTD: number;

  @ApiProperty({
    description:
      'Distinct staff currently on approved leave today (tenant-wide)',
    example: 3,
  })
  outToday: number;

  @ApiProperty({
    description: 'Total active staff in the tenant',
    example: 142,
  })
  totalStaff: number;

  @ApiProperty({
    description:
      'Departments currently breaching the 20% off-at-once threshold, over the next 7 days',
    example: 1,
  })
  conflicts: number;
}
