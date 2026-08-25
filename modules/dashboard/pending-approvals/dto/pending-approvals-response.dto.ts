import { ApiProperty } from '@nestjs/swagger';

export class PendingApprovalItemDto {
  @ApiProperty({
    description: 'Leave request id, needed for Approve/Reject actions',
  })
  leaveRequestId: string;

  @ApiProperty({ example: 'Rose' })
  firstName: string;

  @ApiProperty({ example: 'Connor' })
  lastName: string;

  @ApiProperty({
    description:
      'Requester role, shown as a stand-in for job title until a jobTitle field exists',
    example: 'EMPLOYEE',
  })
  role: string;

  @ApiProperty({ description: 'Leave policy type', example: 'Annual' })
  leaveType: string;

  @ApiProperty({ example: '2026-04-03T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2026-04-07T00:00:00.000Z' })
  endDate: Date;

  @ApiProperty({ example: 5 })
  totalDays: number;

  @ApiProperty({
    description: 'Which stage this request is currently waiting at',
    example: 'team_lead',
  })
  currentStage: 'team_lead' | 'dept_head' | 'hr';
}

export class PendingApprovalsResponseDto {
  @ApiProperty({ type: [PendingApprovalItemDto] })
  requests: PendingApprovalItemDto[];

  @ApiProperty({
    description: 'Total count of pending requests in this list',
    example: 3,
  })
  totalPending: number;
}
