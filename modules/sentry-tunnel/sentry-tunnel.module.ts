import { Module } from '@nestjs/common';
import { SentryTunnelController } from './sentry-tunnel.controller';

@Module({
  controllers: [SentryTunnelController],
})
export class SentryTunnelModule {}
