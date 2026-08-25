import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const PASSWORD_REQUIREMENTS =
  'Password must be at least 8 characters and include: one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';

export class ChangePasswordDto {
  @ApiProperty({
    description: PASSWORD_REQUIREMENTS,
    example: 'OldSecret@123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS })
  oldPassword: string;

  @ApiProperty({
    description: PASSWORD_REQUIREMENTS,
    example: 'NewSecret@123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS })
  newPassword: string;
}
