import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateLeavePolicyCommand } from '../commands/create-leave-policy.command';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { LeavePolicyHelper } from '../leave-policy.helper';
import { RedisService } from '@infra/cache/redis.service';

@CommandHandler(CreateLeavePolicyCommand)
export class CreateLeavePolicyHandler implements ICommandHandler<CreateLeavePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: LeavePolicyHelper,
    private readonly redis: RedisService,
  ) {}

  async execute({ tenantId, dto }: CreateLeavePolicyCommand) {
    this.helper.validateCarryOver(dto.carryOverPolicy, dto.carryOverLimit);
    await this.helper.validateDepartments(tenantId, dto.departmentIds);

    // ── Resolve which departments this policy applies to ──────────────────
    // Documented behavior: empty/omitted departmentIds means ALL departments
    // in the tenant, not zero. Fetch every active department when that's the case.
    let targetDepartmentIds = dto.departmentIds;

    if (!targetDepartmentIds?.length) {
      const allDepartments = await this.prisma.department.findMany({
        where: { tenantId, isActive: true },
        select: { id: true },
      });
      targetDepartmentIds = allDepartments.map((d) => d.id);
    }

    const policy = await this.prisma.leavePolicy.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        accrual: dto.accrual,
        accrualRate: dto.accrualRate,
        maxBalance: dto.maxBalance,
        carryOverPolicy: dto.carryOverPolicy,
        carryOverLimit: dto.carryOverLimit ?? null,
        waitingPeriodDays: dto.waitingPeriodDays ?? null,
        isActive: dto.isActive ?? true,
        tenantId,
        departments: targetDepartmentIds.length
          ? {
              create: targetDepartmentIds.map((departmentId) => ({
                departmentId,
              })),
            }
          : undefined,
      },
      include: { departments: { include: { department: true } } },
    });

    await this.redis.del(`leave-policies:${tenantId}`);

    return this.helper.formatPolicy(policy, tenantId);
  }
}
