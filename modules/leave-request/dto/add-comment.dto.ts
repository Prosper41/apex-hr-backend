import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AddCommentDto {
  @ApiProperty({
    example:
      'This employee is critical to the Q3 delivery, please consider timeline.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  comment: string;
}
