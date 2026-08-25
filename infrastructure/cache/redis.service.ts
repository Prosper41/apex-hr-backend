import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.set(key, payload, 'EX', ttlSeconds);
      } else {
        await this.redis.set(key, payload);
      }
      this.logger.debug(
        `set key=${key} bytes=${payload.length}${ttlSeconds ? ` ttl=${ttlSeconds}s` : ''}`,
      );
    } catch (err) {
      this.logger.warn(`set failed key=${key}: ${(err as Error).message}`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw === null) {
        this.logger.debug(`miss key=${key}`);
        return null;
      }
      this.logger.debug(`hit key=${key}`);
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`get failed key=${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      const removed = await this.redis.del(key);
      this.logger.debug(`del key=${key} removed=${removed}`);
    } catch (err) {
      this.logger.warn(`del failed key=${key}: ${(err as Error).message}`);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const removed = await this.redis.del(...keys);
      this.logger.debug(`del keys=[${keys.join(',')}] removed=${removed}`);
    } catch (err) {
      this.logger.warn(
        `delMany failed keys=[${keys.join(',')}]: ${(err as Error).message}`,
      );
    }
  }

  async flush(): Promise<void> {
    await this.redis.flushall();
    this.logger.warn('flushall executed — entire cache cleared');
  }
}
