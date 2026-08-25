import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '@common/guards/auth.guard';

@Module({
  imports: [JwtModule],
  controllers: [TenantController],
  providers: [TenantService, PrismaService, AuthGuard],
})
export class TenantModule {}
