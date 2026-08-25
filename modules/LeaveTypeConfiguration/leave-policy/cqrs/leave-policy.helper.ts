import { BadRequestException, Injectable } from '@nestjs/common';
import { CarryOverPolicy } from '@prisma/client';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@Injectable()
export class LeavePolicyHelper {
  constructor(private readonly prisma: PrismaService) {}

  validateCarryOver(carryOverPolicy: CarryOverPolicy, carryOverLimit?: number) {
    if (carryOverPolicy === CarryOverPolicy.Limited && !carryOverLimit) {
      throw new BadRequestException(
        'carryOverLimit is required when carryOverPolicy is Limited',
      );
    }
  }

  async validateDepartments(tenantId: string, departmentIds?: string[]) {
    if (!departmentIds?.length) return;

    const found = await this.prisma.department.findMany({
      where: { id: { in: departmentIds }, tenantId },
      select: { id: true },
    });

    if (found.length !== departmentIds.length) {
      throw new BadRequestException(
        'One or more department IDs are invalid or do not belong to your tenant',
      );
    }
  }

  async formatPolicy(policy: any, tenantId: string) {
    const isAllDepartments = policy.departments.length === 0;

    const employees = await this.prisma.user.count({
      where: isAllDepartments
        ? { tenantId }
        : {
            tenantId,
            departmentId: {
              in: policy.departments.map((d: any) => d.departmentId),
            },
          },
    });

    return {
      id: policy.id,
      name: policy.name,
      description: policy.description ?? null,
      type: policy.type,
      accrual: policy.accrual,
      accrualRate: policy.accrualRate,
      maxBalance: policy.maxBalance,
      carryOverPolicy: policy.carryOverPolicy,
      carryOverLimit: policy.carryOverLimit ?? null,
      waitingPeriodDays: policy.waitingPeriodDays ?? null,
      isActive: policy.isActive,
      departments: isAllDepartments
        ? ['All']
        : policy.departments.map((d: any) => d.department.name),
      employees,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }
}
