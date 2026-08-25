import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address of the account to reset',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
