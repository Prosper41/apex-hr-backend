import { Injectable, ExecutionContext } from '@nestjs/common';
// import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

// @Injectable()
// export class CustomThrottlerGuard extends ThrottlerGuard {
//   protected async getTracker(req: Record<string, any>): Promise<string> {
//     const tenantId =
//       req.user?.tenantId ?? req.headers['x-tenant-slug'] ?? 'public';
//     const ip = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
//     return `${tenantId}-${ip}`;
//   }

//   protected async getErrorMessage(
//     context: ExecutionContext,
//     throttlerLimitDetail: ThrottlerLimitDetail,
//   ): Promise<string> {
//     return 'Too many requests. Try again later.';
//   }
// }

@Injectable()
export class CustomThrottlerGuard {}
