// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
// } from '@nestjs/common';
// import { PrismaService } from '@infra/database/prisma/prisma.service';
// import { CreateLeavePolicyDto } from './dto/create-leave-policy.dto';
// import { UpdateLeavePolicyDto } from './dto/update-leave-policy.dto';
// import { CarryOverPolicy } from '@prisma/client';

// @Injectable()
// export class LeavePolicyService {
//   constructor(private readonly prisma: PrismaService) {}

//   // CREATE

//   async create(tenantId: string, dto: CreateLeavePolicyDto) {
//     this.validateCarryOver(dto.carryOverPolicy, dto.carryOverLimit);
//     await this.validateDepartments(tenantId, dto.departmentIds);

//     const policy = await this.prisma.leavePolicy.create({
//       data: {
//         name: dto.name,
//         description: dto.description,
//         type: dto.type,
//         accrual: dto.accrual,
//         accrualRate: dto.accrualRate,
//         maxBalance: dto.maxBalance,
//         carryOverPolicy: dto.carryOverPolicy,
//         carryOverLimit: dto.carryOverLimit ?? null,
//         waitingPeriodDays: dto.waitingPeriodDays ?? null,
//         isActive: dto.isActive ?? true,
//         tenantId,

//         // Link departments if provided
//         departments: dto.departmentIds?.length
//           ? {
//               create: dto.departmentIds.map((departmentId) => ({
//                 departmentId,
//               })),
//             }
//           : undefined,
//       },
//       include: { departments: { include: { department: true } } },
//     });

//     return this.formatPolicy(policy, tenantId);
//   }

//   // GET ALL (for tenant)

//   async findAll(tenantId: string) {
//     const policies = await this.prisma.leavePolicy.findMany({
//       where: { tenantId },
//       include: { departments: { include: { department: true } } },
//       orderBy: { createdAt: 'asc' },
//     });

//     return Promise.all(policies.map((p) => this.formatPolicy(p, tenantId)));
//   }

//   // GET ONE

//   async findOne(tenantId: string, id: string) {
//     const policy = await this.prisma.leavePolicy.findFirst({
//       where: { id, tenantId },
//       include: { departments: { include: { department: true } } },
//     });

//     if (!policy) throw new NotFoundException(`Leave policy not found`);

//     return this.formatPolicy(policy, tenantId);
//   }

//   // UPDATE

//   async update(tenantId: string, id: string, dto: UpdateLeavePolicyDto) {
//     await this.findOne(tenantId, id);
//     if (dto.carryOverPolicy !== undefined) {
//       this.validateCarryOver(dto.carryOverPolicy, dto.carryOverLimit);
//     }

//     if (dto.departmentIds !== undefined) {
//       await this.validateDepartments(tenantId, dto.departmentIds);
//     }

//     const policy = await this.prisma.leavePolicy.update({
//       where: { id },
//       data: {
//         ...(dto.name !== undefined && { name: dto.name }),
//         ...(dto.description !== undefined && { description: dto.description }),
//         ...(dto.type !== undefined && { type: dto.type }),
//         ...(dto.accrual !== undefined && { accrual: dto.accrual }),
//         ...(dto.accrualRate !== undefined && { accrualRate: dto.accrualRate }),
//         ...(dto.maxBalance !== undefined && { maxBalance: dto.maxBalance }),
//         ...(dto.carryOverPolicy !== undefined && {
//           carryOverPolicy: dto.carryOverPolicy,
//         }),
//         ...(dto.carryOverLimit !== undefined && {
//           carryOverLimit: dto.carryOverLimit,
//         }),
//         ...(dto.waitingPeriodDays !== undefined && {
//           waitingPeriodDays: dto.waitingPeriodDays,
//         }),
//         ...(dto.isActive !== undefined && { isActive: dto.isActive }),

//         // Replace department links if provided
//         ...(dto.departmentIds !== undefined && {
//           departments: {
//             deleteMany: {},
//             create: dto.departmentIds.map((departmentId) => ({ departmentId })),
//           },
//         }),
//       },
//       include: { departments: { include: { department: true } } },
//     });

//     return this.formatPolicy(policy, tenantId);
//   }

//   // ─────────────────────────────────────────
//   // DELETE
//   // ─────────────────────────────────────────
//   async remove(tenantId: string, id: string) {
//     await this.findOne(tenantId, id);

//     // Delete junction rows first, then the policy
//     await this.prisma.leavePolicyDepartment.deleteMany({
//       where: { leavePolicyId: id },
//     });

//     await this.prisma.leavePolicy.delete({ where: { id } });

//     return { message: 'Leave policy deleted successfully' };
//   }
//   // GET policies applicable to a specific user
//   async findForUser(tenantId: string, departmentId: string | null) {
//     const policies = await this.prisma.leavePolicy.findMany({
//       where: {
//         tenantId,
//         isActive: true,
//         OR: [
//           { departments: { none: {} } },
//           ...(departmentId
//             ? [{ departments: { some: { departmentId } } }]
//             : []),
//         ],
//       },
//       include: { departments: { include: { department: true } } },
//       orderBy: { createdAt: 'asc' },
//     });

//     return Promise.all(policies.map((p) => this.formatPolicy(p, tenantId)));
//   }

//   // ─────────────────────────────────────────
//   // TOGGLE ACTIVE STATUS
//   // ─────────────────────────────────────────
//   async toggleActive(tenantId: string, id: string) {
//     const policy = await this.findOne(tenantId, id);

//     const updated = await this.prisma.leavePolicy.update({
//       where: { id },
//       data: { isActive: !policy.isActive },
//       include: { departments: { include: { department: true } } },
//     });

//     return this.formatPolicy(updated, tenantId);
//   }

//   private validateCarryOver(
//     carryOverPolicy: CarryOverPolicy,
//     carryOverLimit?: number,
//   ) {
//     if (carryOverPolicy === CarryOverPolicy.Limited && !carryOverLimit) {
//       throw new BadRequestException(
//         'carryOverLimit is required when carryOverPolicy is Limited',
//       );
//     }
//   }

//   private async validateDepartments(
//     tenantId: string,
//     departmentIds?: string[],
//   ) {
//     if (!departmentIds?.length) return;

//     const found = await this.prisma.department.findMany({
//       where: { id: { in: departmentIds }, tenantId },
//       select: { id: true },
//     });

//     if (found.length !== departmentIds.length) {
//       throw new BadRequestException(
//         'One or more department IDs are invalid or do not belong to your tenant',
//       );
//     }
//   }

//   private async formatPolicy(policy: any, tenantId: string) {
//     const isAllDepartments = policy.departments.length === 0;

//     const employees = await this.prisma.user.count({
//       where: isAllDepartments
//         ? { tenantId }
//         : {
//             tenantId,
//             departmentId: {
//               in: policy.departments.map((d: any) => d.departmentId),
//             },
//           },
//     });

//     return {
//       id: policy.id,
//       name: policy.name,
//       description: policy.description ?? null,
//       type: policy.type,
//       accrual: policy.accrual,
//       accrualRate: policy.accrualRate,
//       maxBalance: policy.maxBalance,
//       carryOverPolicy: policy.carryOverPolicy,
//       carryOverLimit: policy.carryOverLimit ?? null,
//       waitingPeriodDays: policy.waitingPeriodDays ?? null,
//       isActive: policy.isActive,
//       departments: isAllDepartments
//         ? ['All']
//         : policy.departments.map((d: any) => d.department.name),
//       employees,
//       createdAt: policy.createdAt,
//       updatedAt: policy.updatedAt,
//     };
//   }
// }
