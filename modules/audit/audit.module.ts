import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@infra/database/prisma/prisma.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { GetAuditLogsHandler } from './queries/handlers/get-audit-logs.handler';
import { GetAuditLogByIdHandler } from './queries/handlers/get-audit-log-by-id.handler';

const QueryHandlers = [GetAuditLogsHandler, GetAuditLogByIdHandler];

@Global()
@Module({
  imports: [CqrsModule, PrismaModule, JwtModule],
  controllers: [AuditController],
  providers: [...QueryHandlers, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
