// import { Module, Global } from '@nestjs/common';
// import { RedisService } from './redis.service';
// import Redis from 'ioredis';

// @Global()
// @Module({
//   providers: [RedisService],
//   exports: [RedisService],
// })
// export class RedisModule {}
import { Global, Module } from '@nestjs/common';
import { createRedisClient } from './redis.config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => createRedisClient(),
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
