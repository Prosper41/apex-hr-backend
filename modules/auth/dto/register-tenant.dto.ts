import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Allows optional country code (+ followed by 1-3 digits) then 7-10 local digits
// Valid: +233201234567, +1234567890, 0201234567, 07911123456
const PHONE_REGEX = /^\+?(\d{1,3})?\d{7,10}$/;

// Blocks disposable/generic domains and enforces real TLDs (2-6 chars)
// Valid: jane.doe@example.com, hr@company.org, admin@firm.co.uk
// Invalid: test@test, user@mailinator.com, admin@tempmail.com
const COMPANY_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@(?!mailinator|tempmail|guerrillamail|throwaway|fakeinbox)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

export class RegisterTenantDto {
  // ── HR Admin Info ──
  @ApiProperty({
    description: 'First name of the HR Admin who will manage this tenant',
    example: 'Prosper',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name of the HR Admin',
    example: 'Gyinka',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description:
      'Email address of the HR Admin. A temporary password will be sent here.',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // ── Company Info ──
  @ApiProperty({
    description: 'Official name of the company being registered',
    example: 'Code Raccoon',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  companyName: string;

  @ApiPropertyOptional({
    description: 'The type or industry of the company',
    example: 'Software Development',
  })
  @IsOptional()
  @IsString()
  companyType?: string;

  @ApiPropertyOptional({
    description: 'Official company email. Must be a real business domain.',
    example: 'hr@example.com',
  })
  @IsOptional()
  @Matches(COMPANY_EMAIL_REGEX, {
    message:
      'companyEmail must be a valid email address with a real domain (e.g. hr@company.com)',
  })
  companyEmail?: string;

  @ApiPropertyOptional({
    description:
      'Company contact phone number. Accepts international format with country code or local numbers. Max 10 digits excluding country code.',
    example: '+233201234567',
  })
  @IsOptional()
  @Matches(PHONE_REGEX, {
    message:
      'companyPhone must be a valid phone number. Examples: +233201234567, 0201234567. Max 10 digits excluding country code.',
  })
  @MaxLength(15, {
    message:
      'Phone number must not exceed 15 characters including country code',
  })
  companyPhone?: string;

  @ApiPropertyOptional({
    description: 'Physical location or address of the company',
    example: 'Accra, Ghana',
  })
  @IsOptional()
  @IsString()
  companyLocation?: string;

  @ApiPropertyOptional({
    description:
      'Date the company was originally registered (defaults to now if omitted)',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  registeredAt?: string;

  @IsOptional()
  @IsString()
  dissolvedAt?: string;
}
