import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../../packages/common/guards/auth.guard';
import { Roles } from '../../packages/common/decorators/roles.decorator';
import { RolesGuard } from '../../packages/common/guards/roles.guard';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../auth/dto/interfaces/request-with-user.interfaces';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  AuditLogResponseDto,
  PaginatedAuditLogResponseDto,
} from './dto/audit-log-response.dto';
import { GetAuditLogsQuery } from './queries/get-audit-logs.query';
import { GetAuditLogByIdQuery } from './queries/get-audit-log-by-id.query';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly queryBus: QueryBus) {}

  // ─────────────────────────────────────────────────────────────
  // GET /audit-logs
  // Full log for the tenant — HR_ADMIN and TENANT_ADMIN only
  // ─────────────────────────────────────────────────────────────
  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Get paginated audit log for the tenant',
    description:
      "Returns all audit entries scoped to the caller's tenant. " +
      'Supports filtering by entity type, specific record, actor, action, and date range. ' +
      'Restricted to HR_ADMIN and TENANT_ADMIN.',
  })
  @ApiOkResponse({
    description: 'Paginated list of audit log entries',
    type: PaginatedAuditLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  async getAuditLogs(
    @Req() req: RequestWithUser,
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedAuditLogResponseDto> {
    return this.queryBus.execute(
      new GetAuditLogsQuery(
        req.user.tenantId,
        query.entityType,
        query.entityId,
        query.actorId,
        query.action,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
        query.page,
        query.limit,
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GET /audit-logs/entity/:entityType/:entityId
  // History of a single record — useful for the leave request detail page
  // ─────────────────────────────────────────────────────────────
  @Get('entity/:entityType/:entityId')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.DEPT_HEAD)
  @ApiOperation({
    summary: 'Get the full audit history of a single record',
    description:
      'Returns every audit entry for a specific entity (e.g. a single LeaveRequest). ' +
      'Useful for the leave request detail page to show the approval timeline. ' +
      'Accessible to DEPT_HEAD, HR_ADMIN, and TENANT_ADMIN.',
  })
  @ApiParam({
    name: 'entityType',
    example: 'LeaveRequest',
    enum: [
      'LeaveRequest',
      'LeaveBalance',
      'LeavePolicy',
      'Department',
      'Employee',
    ],
  })
  @ApiParam({
    name: 'entityId',
    description: 'UUID of the record',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: 'Audit history for the specified record',
    type: PaginatedAuditLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({
    description: 'No audit entries found for this entity',
  })
  async getEntityAuditHistory(
    @Req() req: RequestWithUser,
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedAuditLogResponseDto> {
    return this.queryBus.execute(
      new GetAuditLogsQuery(
        req.user.tenantId,
        entityType,
        entityId,
        undefined,
        undefined,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
        query.page,
        query.limit,
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GET /audit-logs/actor/:actorId
  // Everything a specific user has done — TENANT_ADMIN only
  // ─────────────────────────────────────────────────────────────
  @Get('actor/:actorId')
  @Roles(Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Get all actions performed by a specific user',
    description:
      'Returns every audit entry where the given user was the actor, ' +
      "scoped to the caller's tenant. Restricted to TENANT_ADMIN.",
  })
  @ApiParam({
    name: 'actorId',
    description: 'UUID of the user whose actions to retrieve',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: 'Paginated list of actions taken by this user',
    type: PaginatedAuditLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({
    description: 'Insufficient role — TENANT_ADMIN required',
  })
  async getActorAuditHistory(
    @Req() req: RequestWithUser,
    @Param('actorId', ParseUUIDPipe) actorId: string,
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedAuditLogResponseDto> {
    return this.queryBus.execute(
      new GetAuditLogsQuery(
        req.user.tenantId,
        query.entityType,
        undefined,
        actorId,
        query.action,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
        query.page,
        query.limit,
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GET /audit-logs/:id
  // Single entry by its own ID
  // ─────────────────────────────────────────────────────────────
  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Get a single audit log entry by ID',
    description:
      'Retrieves the full detail of one audit entry. Restricted to HR_ADMIN and TENANT_ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the audit log entry',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: 'The audit log entry',
    type: AuditLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Audit log entry not found' })
  async getAuditLogById(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogResponseDto> {
    return this.queryBus.execute(
      new GetAuditLogByIdQuery(id, req.user.tenantId),
    );
  }
}
