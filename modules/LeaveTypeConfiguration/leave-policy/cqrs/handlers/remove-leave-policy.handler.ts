import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { RemoveLeavePolicyCommand } from '../commands/remove-leave-policy.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { GetLeavePolicyByIdQuery } from '../query/get-leave-policy-by-id.query';

@CommandHandler(RemoveLeavePolicyCommand)
export class RemoveLeavePolicyHandler implements ICommandHandler<RemoveLeavePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({ tenantId, id }: RemoveLeavePolicyCommand) {
    await this.queryBus.execute(new GetLeavePolicyByIdQuery(tenantId, id));

    await this.prisma.$transaction([
      // 1. Delete comments on leave requests tied to this policy
      this.prisma.leaveRequestComment.deleteMany({
        where: { leaveRequest: { leavePolicyId: id } },
      }),
      // 2. Delete leave requests tied to this policy
      this.prisma.leaveRequest.deleteMany({
        where: { leavePolicyId: id },
      }),
      // 3. Delete ledger entries tied to this policy
      this.prisma.leaveBalanceLedger.deleteMany({
        where: { leavePolicyId: id },
      }),
      // 4. Delete department links
      this.prisma.leavePolicyDepartment.deleteMany({
        where: { leavePolicyId: id },
      }),
      // 5. Finally delete the policy itself
      this.prisma.leavePolicy.delete({
        where: { id },
      }),
    ]);

    return { message: 'Leave policy deleted successfully' };
  }
}
