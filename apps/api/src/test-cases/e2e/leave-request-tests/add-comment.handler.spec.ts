import { ForbiddenException } from '@nestjs/common';
import { AddCommentHandler } from 'modules/leave-request/cqrs/handlers/add-comment.handler';
import { FakePrismaService } from './test-utils/fake-prisma';
import { FakeRedisService } from './test-utils/fakes';
import {
  seedAvailableBalance,
  seedLeavePolicy,
  seedTenant,
  seedUser,
} from './test-utils/fixtures';

function wire() {
  const prisma = new FakePrismaService();
  const redis = new FakeRedisService();
  return {
    prisma,
    redis,
    handler: new AddCommentHandler(prisma as any, redis as any),
  };
}

function seedRequest(prisma: FakePrismaService, status: string) {
  const tenant = seedTenant(prisma);
  const departmentId = 'dept_engineering';
  const policy = seedLeavePolicy(prisma, { tenantId: tenant.id });
  const employee = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'EMPLOYEE',
    departmentId,
  });
  const teamLead = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'TEAM_LEAD',
    departmentId,
  });
  const deptHead = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'DEPT_HEAD',
    departmentId,
  });

  seedAvailableBalance(prisma, {
    tenantId: tenant.id,
    employeeId: employee.id,
    leavePolicyId: policy.id,
    amount: 21,
  });

  const leaveRequest =
    prisma.leaveRequests[
      prisma.leaveRequests.push({
        id: 'lr_seeded',
        tenantId: tenant.id,
        departmentId,
        userId: employee.id,
        leavePolicyId: policy.id,
        status,
      }) - 1
    ];

  return { tenant, departmentId, employee, teamLead, deptHead, leaveRequest };
}

describe('AddCommentHandler — current implemented behavior', () => {
  it('Team Lead can comment while status is PENDING', async () => {
    const w = wire();
    const { tenant, teamLead, leaveRequest } = seedRequest(w.prisma, 'PENDING');

    const result = await w.handler.execute({
      leaveRequestId: leaveRequest.id,
      comment: 'Looks fine',
      authorId: teamLead.id,
      tenantId: tenant.id,
    } as any);

    expect(result.comment).toBe('Looks fine');
  });

  it('Team Lead is rejected when status has moved past PENDING', async () => {
    const w = wire();
    const { tenant, teamLead, leaveRequest } = seedRequest(
      w.prisma,
      'TEAM_LEAD_COMMENTED',
    );

    await expect(
      w.handler.execute({
        leaveRequestId: leaveRequest.id,
        comment: 'Too late',
        authorId: teamLead.id,
        tenantId: tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Dept Head can comment while status is TEAM_LEAD_COMMENTED', async () => {
    const w = wire();
    const { tenant, deptHead, leaveRequest } = seedRequest(
      w.prisma,
      'TEAM_LEAD_COMMENTED',
    );

    const result = await w.handler.execute({
      leaveRequestId: leaveRequest.id,
      comment: 'Reviewing now',
      authorId: deptHead.id,
      tenantId: tenant.id,
    } as any);

    expect(result.comment).toBe('Reviewing now');
  });

  it('Dept Head is rejected when status is not yet TEAM_LEAD_COMMENTED', async () => {
    const w = wire();
    const { tenant, deptHead, leaveRequest } = seedRequest(w.prisma, 'PENDING');

    await expect(
      w.handler.execute({
        leaveRequestId: leaveRequest.id,
        comment: 'Too early',
        authorId: deptHead.id,
        tenantId: tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
