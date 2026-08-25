import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { PendingApprovalsController } from './pending-approvals.controller';
import { GetPendingApprovalsHandler } from './queries/handlers/get-pending-approvals.handler';

@Module({
  imports: [CqrsModule],
  controllers: [PendingApprovalsController],
  providers: [PrismaService, GetPendingApprovalsHandler],
})
export class PendingApprovalsModule {}
