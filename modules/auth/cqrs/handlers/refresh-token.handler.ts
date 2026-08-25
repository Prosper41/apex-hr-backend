import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { RefreshTokenCommand } from '../command/refresh-token.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { TokenService } from 'modules/auth/token.services';
import { RedisService } from '@infra/cache/redis.service';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand> {
  private readonly logger = new Logger(RefreshTokenHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly redis: RedisService,
  ) {
    this.logger.debug('RefreshTokenHandler initialized');
  }

  async execute({ refreshToken }: RefreshTokenCommand) {
    this.logger.debug(`[execute] Refresh token request received`);

    const cacheKey = `refresh-token:${refreshToken}`;
    this.logger.debug(`[execute] Cache key resolved to: "${cacheKey}"`);

    this.logger.debug(`[execute] Checking Redis cache...`);
    const cachedToken = await this.redis.get(cacheKey);

    if (cachedToken) {
      this.logger.debug(`[execute] Cache HIT — found token data in cache`);
      this.logger.warn(
        `[execute] Refresh token already used or invalidated — rejecting`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.logger.debug(`[execute] Cache MISS — querying DB for refresh token`);

    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!token) {
      this.logger.warn(`[execute] Refresh token not found in DB`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.logger.debug(`[execute] Token found — checking expiry`);

    if (token.expiresAt < new Date()) {
      this.logger.warn(`[execute] Refresh token expired — deleting from DB`);
      await this.prisma.refreshToken.delete({ where: { id: token.id } });
      throw new UnauthorizedException(
        'Refresh token expired, please log in again',
      );
    }

    this.logger.debug(
      `[execute] Token valid — fetching user id: "${token.userId}"`,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: token.userId },
    });

    if (!user) {
      this.logger.warn(`[execute] User not found for id: "${token.userId}"`);
      throw new UnauthorizedException('User not found');
    }

    this.logger.debug(`[execute] User found — rotating refresh token`);
    await this.prisma.refreshToken.delete({ where: { id: token.id } });
    this.logger.debug(`[execute] Old refresh token deleted from DB`);

    this.logger.debug(`[execute] Blacklisting used token in Redis TTL: 300s`);
    await this.redis.set(cacheKey, { invalidated: true }, 300);
    this.logger.debug(`[execute] Token blacklisted successfully`);

    this.logger.debug(
      `[execute] Generating new token pair for user: "${user.id}"`,
    );
    const tokens = await this.tokenService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      departmentId: user.departmentId,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    this.logger.debug(
      `[execute] New tokens generated successfully for user: "${user.id}"`,
    );
    return tokens;
  }
}
