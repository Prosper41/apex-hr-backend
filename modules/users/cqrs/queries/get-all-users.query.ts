import { PaginationQueryDto } from '@common/pagination/pagination-query.dto';

export class GetAllUsersQuery {
  constructor(
    public readonly tenantId: string,
    public readonly pagination: PaginationQueryDto,
  ) {}
}
