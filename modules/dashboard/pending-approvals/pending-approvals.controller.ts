import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';

import { GetPendingApprovalsQuery } from './queries/get-pending-approvals.query';
import { PendingApprovalsResponseDto } from './dto/pending-approvals-response.dto';

import type { RequestWithUser } from 'modules/auth/dto/interfaces/request-with-user.interfaces';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/pending-approvals')
export class PendingApprovalsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'Get requests awaiting my review',
    description:
      "Returns leave requests currently sitting at the authenticated user's approval stage. TEAM_LEAD sees PENDING, DEPT_HEAD sees TEAM_LEAD_COMMENTED, HR_ADMIN sees DEPT_APPROVED. TENANT_ADMIN and the HR department admin see all pending stages. EMPLOYEE sees none.",
  })
  @ApiOkResponse({
    description: 'Pending approval list for the authenticated user',
    type: PendingApprovalsResponseDto,
  })
  async getPendingApprovals(
    @Req() req: RequestWithUser,
  ): Promise<PendingApprovalsResponseDto> {
    return this.queryBus.execute(
      new GetPendingApprovalsQuery(
        req.user.userId,
        req.user.tenantId,
        req.user.role,
        req.user.departmentId,
      ),
    );
  }
}
