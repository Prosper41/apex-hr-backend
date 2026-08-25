import { Role } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PHONE_REGEX = /^\+?(\d{1,3})?\d{7,10}$/;

export class RegisterDto {
  @ApiProperty({ example: 'Prosper' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Gyinka' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+233201234567' })
  @IsOptional()
  @Matches(PHONE_REGEX, {
    message:
      'contact must be a valid phone number. Examples: +233201234567, 0201234567. Max 10 digits excluding country code.',
  })
  @MaxLength(15, {
    message:
      'Phone number must not exceed 15 characters including country code',
  })
  contact?: string;

  @ApiPropertyOptional({ example: '15 Accra Road, Kasoa' })
  @IsOptional()
  @IsString()
  houseAddress?: string;

  @ApiPropertyOptional({
    example: '1995-08-21',
    description: 'Date of birth. User must be at least 18 years old.',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: Role, example: Role.EMPLOYEE })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @ApiProperty({ example: 'dept-uuid-here' })
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiPropertyOptional({
    example: '2026-07-31',
    description: 'Date the employee joined the company.',
  })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
