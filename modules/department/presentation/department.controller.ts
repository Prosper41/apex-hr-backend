import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { CreateDepartmentDto } from '../application/dtos/create-department.dto';
import { UpdateDepartmentDto } from '../application/dtos/update-department.dto';
import { Request } from 'express';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateDepartmentCommand } from '../application/commands/create-department.command';
import { GetAllDepartmentsQuery } from '../application/queries/get-all-departments.query';
import { GetDepartmentByIdQuery } from '../application/queries/get-department-by-id.query';
import { UpdateDepartmentCommand } from '../application/commands/update-department.command';
import { RemoveDepartmentCommand } from '../application/commands/remove-department.command';
import { GetDepartmentStatsQuery } from '../application/queries/get-department-stats.query';
import { DepartmentStatsResponseDto } from '../application/dtos/department-stats-response.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(
  Role.EMPLOYEE,
  Role.TEAM_LEAD,
  Role.DEPT_HEAD,
  Role.HR_ADMIN,
  Role.TENANT_ADMIN,
)
@Controller('department')
export class DepartmentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: 201, description: 'Department created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @Req() req: Request & { user: any },
  ) {
    return this.commandBus.execute(
      new CreateDepartmentCommand(createDepartmentDto, req.user.tenantId),
    );
  }

  @Get()
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({ summary: 'Get all departments for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of departments returned.' })
  findAll(@Req() req: Request & { user: any }) {
    return this.queryBus.execute(new GetAllDepartmentsQuery(req.user.tenantId));
  }

  @Get('stats')
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({
    summary:
      'Get department page stats (active headcount, on leave today, department count)',
  })
  @ApiResponse({
    status: 200,
    description: 'Stats returned.',
    type: DepartmentStatsResponseDto,
  })
  getStats(@Req() req: Request & { user: any }) {
    const { tenantId, role, departmentId, userId } = req.user;
    return this.queryBus.execute(
      new GetDepartmentStatsQuery(tenantId, role, departmentId, userId),
    );
  }

  @Get(':id')
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({ summary: 'Get a single department by ID' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department returned.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetDepartmentByIdQuery(id));
  }

  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Update a department by ID' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department updated successfully.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.commandBus.execute(
      new UpdateDepartmentCommand(id, updateDepartmentDto),
    );
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete a department by ID' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  remove(@Param('id') id: string) {
    return this.commandBus.execute(new RemoveDepartmentCommand(id));
  }
}
