import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    description: 'The official name of the company/tenant',
    example: 'Code Raccoon',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    description: 'The type or industry of the company',
    example: 'Software Development',
  })
  @IsOptional()
  @IsString()
  companyType?: string;

  @ApiPropertyOptional({
    description: 'Official company email address',
    example: 'jane.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  companyEmail?: string;

  @ApiPropertyOptional({
    description: 'Company contact phone number',
    example: '+233201234567',
  })
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiPropertyOptional({
    description: 'Physical location or address of the company',
    example: 'Accra, Ghana',
  })
  @IsOptional()
  @IsString()
  companyLocation?: string;
}
