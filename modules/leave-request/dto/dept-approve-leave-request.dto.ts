import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeptApproveLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
