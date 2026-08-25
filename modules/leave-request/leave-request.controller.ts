import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SubmitLeaveRequestDto } from './dto/submit-leave-request.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import { SubmitLeaveRequestCommand } from './cqrs/commands/submit-leave-request.command';
import { AddCommentCommand } from './cqrs/commands/add-comment.command';
import { TeamLeadCommentLeaveRequestCommand } from './cqrs/commands/team-lead-comment-leave-request.command';
import { DeptApproveLeaveRequestCommand } from './cqrs/commands/dept-approve-leave-request.command';
import { HrApproveLeaveRequestCommand } from './cqrs/commands/hr-approve-leave-request.command';
import { RejectLeaveRequestCommand } from './cqrs/commands/reject-leave-request.command';
import { CancelLeaveRequestCommand } from './cqrs/commands/cancel-leave-request.command';
import { GetMyLeaveRequestsQuery } from './cqrs/queries/get-my-leave-requests.query';
import { GetAllLeaveRequestsQuery } from './cqrs/queries/get-all-leave-requests.query';
import { GetLeaveRequestByIdQuery } from './cqrs/queries/get-leave-request-by-id.query';
import { DeptApproveLeaveRequestDto } from './dto/dept-approve-leave-request.dto';
@ApiTags('Leave Requests')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles(Role.EMPLOYEE, Role.TEAM_LEAD, Role.DEPT_HEAD, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Submit a new leave request' })
  @ApiResponse({
    status: 201,
    description: 'Leave request submitted successfully',
  })
  submit(
    @Body() dto: SubmitLeaveRequestDto,
    @Req() req: Request & { user: any },
  ) {
    return this.commandBus.execute(
      new SubmitLeaveRequestCommand(dto, req.user.tenantId, req.user.userId),
    );
  }

  @Get('my')
  @Roles(
    Role.EMPLOYEE,
    Role.TEAM_LEAD,
    Role.DEPT_HEAD,
    Role.HR_ADMIN,
    Role.TENANT_ADMIN,
  )
  @ApiOperation({ summary: 'Get my leave requests' })
  getMyRequests(@Req() req: Request & { user: any }) {
    return this.queryBus.execute(
      new GetMyLeaveRequestsQuery(req.user.userId, req.user.tenantId),
    );
  }

  @Get()
  @Roles(Role.TEAM_LEAD, Role.DEPT_HEAD, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Get all leave requests (dept-scoped for non-HR roles)',
  })
  getAll(@Req() req: Request & { user: any }) {
    const { tenantId, departmentId, role } = req.user;
    return this.queryBus.execute(
      new GetAllLeaveRequestsQuery(tenantId, departmentId, role),
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
  @ApiOperation({ summary: 'Get a leave request by ID' })
  @ApiParam({ name: 'id', description: 'Leave request UUID' })
  getOne(@Param('id') id: string, @Req() req: Request & { user: any }) {
    const { userId, tenantId, role, departmentId } = req.user;
    return this.queryBus.execute(
      new GetLeaveRequestByIdQuery(id, userId, tenantId, role, departmentId),
    );
  }

  @Post(':id/comment')
  @Roles(Role.TEAM_LEAD, Role.DEPT_HEAD, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Add a comment to a leave request (does not change status)',
  })
  @ApiParam({ name: 'id', description: 'Leave request UUID' })
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @Req() req: Request & { user: any },
  ) {
    return this.commandBus.execute(
      new AddCommentCommand(
        id,
        req.user.tenantId,
        req.user.userId,
        dto.comment,
      ),
    );
  }

  @Patch(':id/team-lead-comment')
  @Roles(Role.TEAM_LEAD)
  @ApiOperation({
    summary:
      'Team Lead submits a mandatory comment (Stage 1 of 3) — advances request to Dept Head',
  })
  @ApiParam({ name: 'id', description: 'Leave request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comment submitted, request forwarded to Department Head',
  })
  teamLeadComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @Req() req: Request & { user: any },
  ) {
    return this.commandBus.execute(
      new TeamLeadCommentLeaveRequestCommand(
        id,
        req.user.tenantId,
        req.user.userId,
        dto.comment,
      ),
    );
  }

  @Patch(':id/dept-approve')
  @Roles(Role.DEPT_HEAD)
  @ApiOperation({
    summary: 'Department Head approves a leave request (Stage 2 of 3)',
  })
  @ApiParam({ name: 'id', description: 'Leave request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Approved by Department Head, awaiting HR Admin',
  })
  deptApprove(
    @Param('id') id: string,
    @Body() dto: DeptApproveLeaveRequestDto,
    @Req() req: Request & { user: any },
  ) {
    return this.commandBus.execute(
      new DeptApproveLeaveRequestCommand(
        id,
        req.user.tenantId,
        req.user.userId,
        dto.comment,
      ),
    );
  }

  @Patch(':id/hr-approve')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary:
      'HR Admin gives final approval (Stage 3 of 3). Tenant Admin only when the submitter is HR Admin.',
  })
  @ApiParam({ name: 'id', description: 'Leave request UUID' })
  @ApiResponse({ status: 200, description: 'Leave request fully approved' })
  hrApprove(@Param('id') id: string, @Req() req: Request & { user: any }) {
    return this.commandBus.execute(
      new HrApproveLeaveRequestCommand(id, req.user.tenantId, req.user.userId),
    );
  }

  @Patch(':id/reject')
  @Roles(Role.DEPT_HEAD, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Reject a leave request at its current stage' })
  @ApiParam({ name: 'id', description: 'Leave request UUID' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectLeaveRequestDto,
    @Req() req: Request & { user: any },
  ) {
    return this.commandBus.execute(
      new RejectLeaveRequestCommand(
        id,
        req.user.tenantId,
        req.user.userId,
        dto.reason,
      ),
    );
  }

  @Patch(':id/cancel')
  @Roles(Role.EMPLOYEE, Role.TEAM_LEAD, Role.DEPT_HEAD, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Cancel your own pending leave request' })
  @ApiParam({ name: 'id', description: 'Leave request UUID' })
  cancel(@Param('id') id: string, @Req() req: Request & { user: any }) {
    return this.commandBus.execute(
      new CancelLeaveRequestCommand(id, req.user.tenantId, req.user.userId),
    );
  }
}
