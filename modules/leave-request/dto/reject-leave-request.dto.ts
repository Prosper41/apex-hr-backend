import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectLeaveRequestDto {
  @ApiPropertyOptional({ example: 'Team is short-staffed for this period.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
