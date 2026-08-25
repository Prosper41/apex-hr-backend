import { ApiProperty } from '@nestjs/swagger';

export class DepartmentStatsResponseDto {
  @ApiProperty({
    description:
      'Active staff, scoped to your department unless HR Admin/Tenant Admin',
    example: 9,
  })
  totalEmployees: number;

  @ApiProperty({
    description:
      'Same as totalEmployees — offboarded staff are excluded from both',
    example: 9,
  })
  active: number;

  @ApiProperty({
    description:
      'Active staff currently on approved leave today, same scope as totalEmployees',
    example: 0,
  })
  onLeave: number;

  @ApiProperty({
    description: 'Total active departments in the tenant (always tenant-wide)',
    example: 3,
  })
  departments: number;
}
