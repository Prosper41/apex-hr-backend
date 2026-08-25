import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeaveRequestController } from './leave-request.controller';
import { ConflictDetectionService } from 'modules/leave-request/services/conflict-detection.service';
import { LeaveApprovalRoutingService } from './services/leave-approval-routing.service';
import { LeaveBalanceService } from './services/leave-balance.service';
import { GetAllLeaveRequestsHandler } from './cqrs/handlers/get-all-leave-requests.handler';
import { GetMyLeaveRequestsHandler } from './cqrs/handlers/get-my-leave-requests.handler';
import { GetLeaveRequestByIdHandler } from './cqrs/handlers/get-leave-request-by-id.handler';
import { CancelLeaveRequestHandler } from './cqrs/handlers/cancel-leave-request.handler';
import { TeamLeadCommentLeaveRequestHandler } from './cqrs/handlers/team-lead-comment-leave-request.handler';
import { DeptApproveLeaveRequestHandler } from './cqrs/handlers/dept-approve-leave-request.handler';
import { HrApproveLeaveRequestHandler } from './cqrs/handlers/hr-approve-leave-request.handler';
import { RejectLeaveRequestHandler } from './cqrs/handlers/reject-leave-request.handler';
import { SubmitLeaveRequestHandler } from './cqrs/handlers/submit-leave-request.handler';
import { AddCommentHandler } from './cqrs/handlers/add-comment.handler';
import { AuthModule } from '../auth/auth.module';
import { LeaveBalanceModule } from 'modules/leave-balance/leave-balance.module';
import { MailModule } from '@infra/mail/mail.module';
import { BullModule } from '@nestjs/bullmq';
import { LeaveReviewAuthorizationService } from './services/leave-review-authorization.service';
import { BullMQConfigModule } from '@infra/queue/bull_module';

export const QueryHandlers = [
  GetAllLeaveRequestsHandler,
  GetMyLeaveRequestsHandler,
  GetLeaveRequestByIdHandler,
];

export const CommandHandlers = [
  SubmitLeaveRequestHandler,
  AddCommentHandler,
  TeamLeadCommentLeaveRequestHandler,
  DeptApproveLeaveRequestHandler,
  HrApproveLeaveRequestHandler,
  RejectLeaveRequestHandler,
  CancelLeaveRequestHandler,
];

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    LeaveBalanceModule,
    MailModule,
    BullMQConfigModule,
  ],
  controllers: [LeaveRequestController],
  providers: [
    PrismaService,
    ConflictDetectionService,
    LeaveApprovalRoutingService,
    LeaveBalanceService,
    LeaveReviewAuthorizationService,
    ...QueryHandlers,
    ...CommandHandlers,
  ],
})
export class LeaveRequestModule {}
