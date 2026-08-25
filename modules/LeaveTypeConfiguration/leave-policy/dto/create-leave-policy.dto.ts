import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { AccrualFrequency, CarryOverPolicy, LeaveType } from '@prisma/client';

export class CreateLeavePolicyDto {
  @ApiProperty({ example: 'Annual Leave' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Standard annual vacation entitlement for all employees',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: LeaveType, example: LeaveType.Annual })
  @IsEnum(LeaveType)
  type!: LeaveType;

  @ApiProperty({ enum: AccrualFrequency, example: AccrualFrequency.Monthly })
  @IsEnum(AccrualFrequency)
  accrual!: AccrualFrequency;

  @ApiProperty({
    example: 1.67,
    description:
      'Number of days accrued per cycle (e.g. 1.67 for monthly, 10 for yearly, 90 for one-time)',
  })
  @IsNumber()
  @Min(0)
  accrualRate!: number;

  @ApiProperty({
    example: 20,
    description: 'Maximum leave balance an employee can hold in days',
  })
  @IsNumber()
  @Min(0)
  maxBalance!: number;

  @ApiProperty({ enum: CarryOverPolicy, example: CarryOverPolicy.Limited })
  @IsEnum(CarryOverPolicy)
  carryOverPolicy!: CarryOverPolicy;

  @ApiPropertyOptional({
    example: 5,
    description:
      'Only required when carryOverPolicy is Limited. Max days that can be carried over.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carryOverLimit?: number;

  @ApiPropertyOptional({
    example: 90,
    description:
      'Waiting period in days before employee is eligible. Null means no waiting period.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  waitingPeriodDays?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['dept-uuid-1', 'dept-uuid-2'],
    description:
      'Department IDs this policy applies to. Empty array or omitted means ALL departments.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];
}
