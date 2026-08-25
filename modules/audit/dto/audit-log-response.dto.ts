import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'tenant-uuid' })
  tenantId!: string;

  @ApiProperty({
    example: 'LeaveRequest',
    description: 'The type of record that was changed',
  })
  entityType!: string;

  @ApiProperty({ example: 'entity-uuid' })
  entityId!: string;

  @ApiProperty({
    example: 'LEAVE_HR_APPROVED',
    description: 'The action that triggered this log entry',
  })
  action!: string;

  @ApiProperty({ example: 'actor-uuid' })
  actorId!: string;

  @ApiProperty({ example: 'HR_ADMIN' })
  actorRole!: string;

  @ApiPropertyOptional({
    example: { status: 'DEPT_APPROVED' },
    description:
      'Snapshot of relevant fields BEFORE the change. Null for create actions.',
    nullable: true,
  })
  before!: unknown;

  @ApiPropertyOptional({
    example: { status: 'APPROVED', hrApproverId: 'actor-uuid' },
    description:
      'Snapshot of relevant fields AFTER the change. Null for delete actions.',
    nullable: true,
  })
  after!: unknown;

  @ApiPropertyOptional({
    example: { reason: 'Correcting accrual error from March', adjustment: 2 },
    description:
      'Extra context — mandatory reason for balance adjustments, conflict flags, etc.',
    nullable: true,
  })
  metadata!: unknown;

  @ApiProperty({ example: '2025-06-15T10:30:00.000Z' })
  createdAt!: Date;
}

export class PaginatedAuditLogResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data!: AuditLogResponseDto[];

  @ApiProperty({
    example: 142,
    description: 'Total number of matching records',
  })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 8 })
  totalPages!: number;
}
