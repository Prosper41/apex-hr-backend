import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

const logger = new Logger('BullMQConfigModule');

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');

        let connection: any;
        if (redisUrl) {
          const url = new URL(redisUrl);
          connection = {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
          };
          logger.debug(`Configuring BullMQ connection -> host: ${url.hostname} (TLS: ${url.protocol === 'rediss:'})`);
        } else {
          const redisHost = config.get<string>('REDIS_HOST', 'localhost');
          const redisPort = config.get<number>('REDIS_PORT', 6379);
          connection = { host: redisHost, port: redisPort };
          logger.debug(`Configuring BullMQ connection -> host: ${redisHost}, port: ${redisPort}`);
        }

        const options = {
          connection,
          defaultJobOptions: {
            attempts: 5,
            removeOnComplete: 1000,
            removeOnFail: 3000,
            lifo: false,
            backoff: { type: 'exponential', delay: 1000 },
          },
        };
        logger.debug(
          `BullMQ defaultJobOptions: ${JSON.stringify(options.defaultJobOptions)}`,
        );
        return options;
      },
    }),
    BullModule.registerQueue({
      name: 'leave-requests',
    }),
  ],
  exports: [BullModule],
})
export class BullMQConfigModule {
  private readonly logger = new Logger(BullMQConfigModule.name);
  constructor() {
    this.logger.log('BullMQConfigModule initialized');
    this.logger.debug('Queue registered: leave-requests');
  }
}
