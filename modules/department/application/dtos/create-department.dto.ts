import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Name of the department',
    example: 'Engineering',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    description: 'A brief description of the department',
    example: 'Handles all software development and infrastructure.',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;
  @ApiPropertyOptional({
    description: "Whether this department is the tenant's HR department",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isHrDepartment?: boolean;
}
