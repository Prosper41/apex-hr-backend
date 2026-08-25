import { ApiProperty } from '@nestjs/swagger';

export class DepartmentAbsentCountDto {
  @ApiProperty({ description: 'Department name', example: 'IT' })
  departmentName: string;

  @ApiProperty({
    description: 'Employees absent today in this department',
    example: 2,
  })
  absentCount: number;
}

export class DepartmentTodayResponseDto {
  @ApiProperty({ type: [DepartmentAbsentCountDto] })
  departments: DepartmentAbsentCountDto[];
}
