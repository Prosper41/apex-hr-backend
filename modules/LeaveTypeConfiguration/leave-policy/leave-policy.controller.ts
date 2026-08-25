import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { CreateLeavePolicyDto } from './dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from './dto/update-leave-policy.dto';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthGuard } from '@common/guards/auth.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateLeavePolicyCommand } from './cqrs/commands/create-leave-policy.command';
import { GetLeavePoliciesForUserQuery } from './cqrs/query/get-leave-policies-for-user.query';
import { GetAllLeavePoliciesQuery } from './cqrs/query/get-all-leave-policies.query';
import { GetLeavePolicyByIdHandler } from './cqrs/handlers/get-leave-policy-by-id.handler';
import { GetLeavePolicyByIdQuery } from './cqrs/query/get-leave-policy-by-id.query';
import { UpdateLeavePolicyCommand } from './cqrs/commands/update-leave-policy.command';
import { RemoveLeavePolicyCommand } from './cqrs/commands/remove-leave-policy.command';
import { ToggleActiveLeavePolicyCommand } from './cqrs/commands/toggle-active-leave-policy.command';

@ApiTags('Leave Policies')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('leave-policies')
export class LeavePolicyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // POST /leave-policies
  @Post()
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Create a new leave policy' })
  @ApiResponse({
    status: 201,
    description: 'Leave policy created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid carry over configuration' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  create(
    @Req() req: Request & { user: any },
    @Body() dto: CreateLeavePolicyDto,
  ) {
    return this.commandBus.execute(
      new CreateLeavePolicyCommand(req.user.tenantId, dto),
    );
  }

  // GET /leave-policies/my-policies  ← must be BEFORE :id
  @Get('my-policies')
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({
    summary: 'Get leave policies applicable to the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of applicable leave policies returned',
  })
  getMyPolicies(@Req() req: Request & { user: any }) {
    return this.queryBus.execute(
      new GetLeavePoliciesForUserQuery(
        req.user.tenantId,
        req.user.departmentId,
      ),
    );
  }

  // GET /leave-policies
  @Get()
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Get all leave policies for the tenant' })
  @ApiResponse({ status: 200, description: 'List of leave policies returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findAll(@Req() req: Request & { user: any }) {
    return this.queryBus.execute(
      new GetAllLeavePoliciesQuery(req.user.tenantId),
    );
  }

  // GET /leave-policies/:id
  @Get(':id')
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Get a single leave policy by id' })
  @ApiParam({ name: 'id', description: 'Leave policy UUID' })
  @ApiResponse({ status: 200, description: 'Leave policy found' })
  @ApiResponse({ status: 404, description: 'Leave policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  findOne(@Req() req: Request & { user: any }, @Param('id') id: string) {
    return this.queryBus.execute(
      new GetLeavePolicyByIdQuery(req.user.tenantId, id),
    );
  }

  // PATCH /leave-policies/:id
  @Patch(':id')
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Update a leave policy' })
  @ApiParam({ name: 'id', description: 'Leave policy UUID' })
  @ApiResponse({
    status: 200,
    description: 'Leave policy updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Leave policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  update(
    @Req() req: Request & { user: any },
    @Param('id') id: string,
    @Body() dto: UpdateLeavePolicyDto,
  ) {
    return this.commandBus.execute(
      new UpdateLeavePolicyCommand(req.user.tenantId, id, dto),
    );
  }

  // DELETE /leave-policies/:id
  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Delete a leave policy' })
  @ApiParam({ name: 'id', description: 'Leave policy UUID' })
  @ApiResponse({
    status: 200,
    description: 'Leave policy deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Leave policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — TENANT_ADMIN only' })
  remove(@Req() req: Request & { user: any }, @Param('id') id: string) {
    return this.commandBus.execute(
      new RemoveLeavePolicyCommand(req.user.tenantId, id),
    );
  }

  // PATCH /leave-policies/:id/toggle-active
  @Patch(':id/toggle-active')
  @Roles(Role.TENANT_ADMIN, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Toggle active status of a leave policy' })
  @ApiParam({ name: 'id', description: 'Leave policy UUID' })
  @ApiResponse({
    status: 200,
    description: 'Leave policy status toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Leave policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient role' })
  toggleActive(@Req() req: Request & { user: any }, @Param('id') id: string) {
    return this.commandBus.execute(
      new ToggleActiveLeavePolicyCommand(req.user.tenantId, id),
    );
  }
}
