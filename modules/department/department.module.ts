import { Module } from '@nestjs/common';
import { DepartmentController } from './presentation/department.controller';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateDepartmentHandler } from './application/handlers/create-department.handler';
import { GetAllDepartmentsHandler } from './application/handlers/get-all-departments.handler';
import { GetDepartmentByIdHandler } from './application/handlers/get-department-by-id.handler';
import { RemoveDepartmentHandler } from './application/handlers/remove-department.handler';
import { UpdateDepartmentHandler } from './application/handlers/update-department.handler';
import { PrismaModule } from '@infra/database/prisma/prisma.module';
import { RolesGuard } from '@common/guards/roles.guard';
import { GetDepartmentStatsHandler } from './application/handlers/get-department-stats.handler';
import { DepartmentStaffingStatsService } from './application/department-staffing-stats.service';

@Module({
  imports: [JwtModule, CqrsModule, PrismaModule],
  controllers: [DepartmentController],
  providers: [
    RolesGuard,
    CreateDepartmentHandler,
    GetAllDepartmentsHandler,
    GetDepartmentByIdHandler,
    RemoveDepartmentHandler,
    UpdateDepartmentHandler,
    GetDepartmentStatsHandler,
    DepartmentStaffingStatsService,
  ],
})
export class DepartmentModule {}
