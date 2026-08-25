import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({ example: 'uuid-refresh-token-here' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
