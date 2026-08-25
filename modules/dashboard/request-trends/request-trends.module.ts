import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { RequestTrendsController } from './request-trends.controller';
import { GetRequestTrendsHandler } from './queries/handlers/get-request-trends.handler';
@Module({
  imports: [CqrsModule],
  controllers: [RequestTrendsController],
  providers: [PrismaService, GetRequestTrendsHandler],
})
export class RequestTrendsModule {}
