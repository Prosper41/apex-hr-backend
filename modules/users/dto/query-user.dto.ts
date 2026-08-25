// import { IsEnum, IsOptional, IsString } from 'class-validator';
// import { ApiPropertyOptional } from '@nestjs/swagger';
// import { PaginationQueryDto } from '../../common/pagination/dtos/pagination-query.dto';
// import { Role } from '@prisma/client';

// export class QueryUserDto extends PaginationQueryDto {
//   @ApiPropertyOptional({
//     description: 'Search by name or email',
//     example: 'john',
//   })
//   @IsOptional()
//   @IsString()
//   search?: string;

//   @ApiPropertyOptional({
//     description: 'Filter by role',
//     enum: Role,
//     example: Role.EMPLOYEE,
//   })
//   @IsOptional()
//   @IsEnum(Role)
//   role?: Role;
// }
