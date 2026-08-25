import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '@common/pagination/pagination-query.dto';

export class QueryDepartmentDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by department name',
    example: 'Engineering',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;
}
