// import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
// import { GetAllLeavePoliciesQuery } from '../query/get-all-leave-policies.query';
// import { PrismaService } from '@infra/database/prisma/prisma.service';
// import { LeavePolicyHelper } from '../leave-policy.helper';

// @QueryHandler(GetAllLeavePoliciesQuery)
// export class GetAllLeavePoliciesHandler implements IQueryHandler<GetAllLeavePoliciesQuery> {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly helper: LeavePolicyHelper,
//   ) {}

//   async execute({ tenantId }: GetAllLeavePoliciesQuery) {
//     const policies = await this.prisma.leavePolicy.findMany({
//       where: { tenantId },
//       include: { departments: { include: { department: true } } },
//       orderBy: { createdAt: 'asc' },
//     });

//     return Promise.all(
//       policies.map((p) => this.helper.formatPolicy(p, tenantId)),
//     );
//   }
// }
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetAllLeavePoliciesQuery } from '../query/get-all-leave-policies.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeavePolicyHelper } from '../leave-policy.helper';
import { RedisService } from '@infra/cache/redis.service';

@QueryHandler(GetAllLeavePoliciesQuery)
export class GetAllLeavePoliciesHandler implements IQueryHandler<GetAllLeavePoliciesQuery> {
  private readonly logger = new Logger(GetAllLeavePoliciesHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LeavePolicyHelper,
    private readonly redis: RedisService,
  ) {
    this.logger.debug('GetAllLeavePoliciesHandler initialized');
  }

  async execute({ tenantId }: GetAllLeavePoliciesQuery) {
    this.logger.debug(`[execute] Query triggered for tenantId: "${tenantId}"`);

    const cacheKey = `leave-policies:${tenantId}`;
    this.logger.debug(`[execute] Cache key resolved to: "${cacheKey}"`);

    this.logger.debug(`[execute] Checking Redis cache...`);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(
        `[execute] Cache HIT — returning cached data for key: "${cacheKey}"`,
      );
      this.logger.debug(`[execute] Cached payload: ${JSON.stringify(cached)}`);
      return cached;
    }

    this.logger.debug(
      `[execute] Cache MISS — hitting Prisma DB for tenantId: "${tenantId}"`,
    );

    const policies = await this.prisma.leavePolicy.findMany({
      where: { tenantId },
      include: { departments: { include: { department: true } } },
      orderBy: { createdAt: 'asc' },
    });

    this.logger.debug(
      `[execute] DB query complete — ${policies.length} policy(s) found`,
    );

    const formatted = await Promise.all(
      policies.map((p) => this.helper.formatPolicy(p, tenantId)),
    );

    this.logger.debug(
      `[execute] Formatted payload: ${JSON.stringify(formatted)}`,
    );

    this.logger.debug(
      `[execute] Writing to Redis cache with key: "${cacheKey}" TTL: 300s`,
    );
    await this.redis.set(cacheKey, formatted, 300);
    this.logger.debug(
      `[execute] Cache populated successfully for key: "${cacheKey}"`,
    );

    return formatted;
  }
}
