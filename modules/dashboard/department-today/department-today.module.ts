import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { DepartmentTodayController } from './department-today.controller';
import { GetDepartmentTodayHandler } from './queries/handlers/get-department-today.handler';

@Module({
  imports: [CqrsModule],
  controllers: [DepartmentTodayController],
  providers: [PrismaService, GetDepartmentTodayHandler],
})
export class DepartmentTodayModule {}
