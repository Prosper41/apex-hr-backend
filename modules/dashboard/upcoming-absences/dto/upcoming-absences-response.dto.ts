import { ApiProperty } from '@nestjs/swagger';

export class UpcomingAbsenceItemDto {
  @ApiProperty({ example: 'Efu' })
  firstName: string;

  @ApiProperty({ example: 'Dohwedohwe' })
  lastName: string;

  @ApiProperty({ description: 'Leave policy type', example: 'Annual' })
  leaveType: string;

  @ApiProperty({ example: '2026-02-20T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-02-21T00:00:00.000Z' })
  endDate: Date;
}

export class UpcomingAbsencesResponseDto {
  @ApiProperty({ type: [UpcomingAbsenceItemDto] })
  absences: UpcomingAbsenceItemDto[];

  @ApiProperty({ description: 'Total count of upcoming absences', example: 3 })
  totalUpcoming: number;
}
