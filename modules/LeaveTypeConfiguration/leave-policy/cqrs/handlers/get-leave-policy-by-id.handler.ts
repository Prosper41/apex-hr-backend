// import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
// import { NotFoundException } from '@nestjs/common';
// import { GetLeavePolicyByIdQuery } from '../query/get-leave-policy-by-id.query';
// import { PrismaService } from '@infra/database/prisma/prisma.service';
// import { LeavePolicyHelper } from '../leave-policy.helper';

// @QueryHandler(GetLeavePolicyByIdQuery)
// export class GetLeavePolicyByIdHandler implements IQueryHandler<GetLeavePolicyByIdQuery> {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly helper: LeavePolicyHelper,
//   ) {}

//   async execute({ tenantId, id }: GetLeavePolicyByIdQuery) {
//     const policy = await this.prisma.leavePolicy.findFirst({
//       where: { id, tenantId },
//       include: { departments: { include: { department: true } } },
//     });

//     if (!policy) throw new NotFoundException('Leave policy not found');

//     return this.helper.formatPolicy(policy, tenantId);
//   }
// }
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Logger } from '@nestjs/common';
import { GetLeavePolicyByIdQuery } from '../query/get-leave-policy-by-id.query';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeavePolicyHelper } from '../leave-policy.helper';
import { RedisService } from '@infra/cache/redis.service';

@QueryHandler(GetLeavePolicyByIdQuery)
export class GetLeavePolicyByIdHandler implements IQueryHandler<GetLeavePolicyByIdQuery> {
  private readonly logger = new Logger(GetLeavePolicyByIdHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LeavePolicyHelper,
    private readonly redis: RedisService,
  ) {
    this.logger.debug('GetLeavePolicyByIdHandler initialized');
  }

  async execute({ tenantId, id }: GetLeavePolicyByIdQuery) {
    this.logger.debug(
      `[execute] Query triggered for policy id: "${id}", tenantId: "${tenantId}"`,
    );

    const cacheKey = `leave-policy:${tenantId}-${id}`;
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
      `[execute] Cache MISS — hitting Prisma DB for policy id: "${id}"`,
    );

    const policy = await this.prisma.leavePolicy.findFirst({
      where: { id, tenantId },
      include: { departments: { include: { department: true } } },
    });

    this.logger.debug(`[execute] DB query complete`);

    if (!policy) {
      this.logger.warn(`[execute] Leave policy not found for id: "${id}"`);
      throw new NotFoundException('Leave policy not found');
    }

    const formatted = await this.helper.formatPolicy(policy, tenantId);

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
