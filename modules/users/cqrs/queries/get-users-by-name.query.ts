import { PaginationQueryDto } from '@common/pagination/pagination-query.dto';

export class GetUsersByNameQuery {
  constructor(
    public readonly tenantId: string,
    public readonly paginationDto: PaginationQueryDto,
    public readonly firstName?: string,
    public readonly lastName?: string,
  ) {}
}
