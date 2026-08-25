import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ToggleActiveLeavePolicyCommand } from '../commands/toggle-active-leave-policy.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeavePolicyHelper } from '../leave-policy.helper';
import { QueryBus } from '@nestjs/cqrs';
import { GetLeavePolicyByIdQuery } from '../query/get-leave-policy-by-id.query';

@CommandHandler(ToggleActiveLeavePolicyCommand)
export class ToggleActiveLeavePolicyHandler implements ICommandHandler<ToggleActiveLeavePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LeavePolicyHelper,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({ tenantId, id }: ToggleActiveLeavePolicyCommand) {
    const policy = await this.queryBus.execute(
      new GetLeavePolicyByIdQuery(tenantId, id),
    );

    const updated = await this.prisma.leavePolicy.update({
      where: { id },
      data: { isActive: !policy.isActive },
      include: { departments: { include: { department: true } } },
    });

    return this.helper.formatPolicy(updated, tenantId);
  }
}
