import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Amponsah' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+233551234567' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ example: 'House No. 5, Accra' })
  @IsOptional()
  @IsString()
  houseAddress?: string;

  @ApiPropertyOptional({ example: '1995-08-20' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.TEAM_LEAD })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 'dept-uuid-here' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'jane@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
