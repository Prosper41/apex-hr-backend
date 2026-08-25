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
        const redisHost = config.get<string>('REDIS_HOST', 'localhost');
        const redisPort = config.get<number>('REDIS_PORT', 6379);

        logger.debug(
          `Configuring BullMQ connection -> host: ${redisHost}, port: ${redisPort}`,
        );

        const options = {
          connection: {
            host: redisHost,
            port: redisPort,
          },
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
