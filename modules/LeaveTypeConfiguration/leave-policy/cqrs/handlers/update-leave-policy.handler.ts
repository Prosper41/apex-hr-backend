import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateLeavePolicyCommand } from '../commands/update-leave-policy.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeavePolicyHelper } from '../leave-policy.helper';
import { QueryBus } from '@nestjs/cqrs';
import { GetLeavePolicyByIdQuery } from '../query/get-leave-policy-by-id.query';

@CommandHandler(UpdateLeavePolicyCommand)
export class UpdateLeavePolicyHandler implements ICommandHandler<UpdateLeavePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LeavePolicyHelper,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({ tenantId, id, dto }: UpdateLeavePolicyCommand) {
    await this.queryBus.execute(new GetLeavePolicyByIdQuery(tenantId, id));

    if (dto.carryOverPolicy !== undefined) {
      this.helper.validateCarryOver(dto.carryOverPolicy, dto.carryOverLimit);
    }

    if (dto.departmentIds !== undefined) {
      await this.helper.validateDepartments(tenantId, dto.departmentIds);
    }

    const policy = await this.prisma.leavePolicy.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.accrual !== undefined && { accrual: dto.accrual }),
        ...(dto.accrualRate !== undefined && { accrualRate: dto.accrualRate }),
        ...(dto.maxBalance !== undefined && { maxBalance: dto.maxBalance }),
        ...(dto.carryOverPolicy !== undefined && {
          carryOverPolicy: dto.carryOverPolicy,
        }),
        ...(dto.carryOverLimit !== undefined && {
          carryOverLimit: dto.carryOverLimit,
        }),
        ...(dto.waitingPeriodDays !== undefined && {
          waitingPeriodDays: dto.waitingPeriodDays,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.departmentIds !== undefined && {
          departments: {
            deleteMany: {},
            create: dto.departmentIds.map((departmentId) => ({ departmentId })),
          },
        }),
      },
      include: { departments: { include: { department: true } } },
    });

    return this.helper.formatPolicy(policy, tenantId);
  }
}
