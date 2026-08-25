import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'infrastructure/database/prisma/prisma.service';
import { AddCommentCommand } from '../commands/add-comment.command';
import { LeaveReviewAuthorizationService } from 'modules/leave-request/services/leave-review-authorization.service';

@CommandHandler(AddCommentCommand)
export class AddCommentHandler implements ICommandHandler<AddCommentCommand> {
  private readonly logger = new Logger(AddCommentHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: LeaveReviewAuthorizationService,
  ) {}

  async execute({
    leaveRequestId,
    tenantId,
    actorId,
    comment,
  }: AddCommentCommand) {
    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
    });
    if (!leaveRequest) throw new NotFoundException('Leave request not found');

    await this.auth.assertCanComment(
      actorId,
      tenantId,
      leaveRequest.departmentId,
    );

    const created = await this.prisma.leaveRequestComment.create({
      data: { leaveRequestId, authorId: actorId, comment },
    });

    this.logger.log(
      `User ${actorId} added a comment to leave request ${leaveRequestId}`,
    );
    return created;
  }
}
