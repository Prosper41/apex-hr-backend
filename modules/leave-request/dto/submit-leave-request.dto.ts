import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SubmitLeaveRequestDto {
  @ApiProperty({
    example: 'policy-uuid-here',
    description: 'Leave policy ID (the leave type)',
  })
  @IsString()
  @IsNotEmpty()
  leavePolicyId: string;

  @ApiProperty({
    example: 'dept-uuid-here',
    description: 'Department the request is for',
  })
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({
    example: '2026-06-01',
    description: 'Start date of the leave',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-06-05', description: 'End date of the leave' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Request only half a day',
  })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @ApiProperty({
    example: 'Attending a medical appointment',
    description: 'Reason for leave',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
