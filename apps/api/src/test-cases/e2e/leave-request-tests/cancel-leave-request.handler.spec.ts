import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CancelLeaveRequestHandler } from 'modules/leave-request/cqrs/handlers/cancel-leave-request.handler';
import { FakePrismaService } from './test-utils/fake-prisma';
import {
  FakeCommandBus,
  FakeQueue,
  FakeRedisService,
} from './test-utils/fakes';
import { seedTenant, seedUser } from './test-utils/fixtures';

function wire() {
  const prisma = new FakePrismaService();
  const redis = new FakeRedisService();
  const queue = new FakeQueue();
  const commandBus = new FakeCommandBus();
  return {
    prisma,
    redis,
    queue,
    commandBus,
    handler: new CancelLeaveRequestHandler(
      prisma as any,
      commandBus as any,
      redis as any,
      queue as any,
    ),
  };
}

function seedRequest(
  prisma: FakePrismaService,
  status: string,
  ownerOverride?: any,
) {
  const tenant = seedTenant(prisma);
  const owner =
    ownerOverride ??
    seedUser(prisma, { tenantId: tenant.id, role: 'EMPLOYEE' });

  const leaveRequest =
    prisma.leaveRequests[
      prisma.leaveRequests.push({
        id: 'lr_seeded',
        tenantId: tenant.id,
        departmentId: 'dept_engineering',
        userId: owner.id,
        leavePolicyId: 'policy_1',
        status,
      }) - 1
    ];

  return { tenant, owner, leaveRequest };
}

describe('CancelLeaveRequestHandler', () => {
  it('owner can cancel their own PENDING request', async () => {
    const w = wire();
    const { tenant, owner, leaveRequest } = seedRequest(w.prisma, 'PENDING');

    const result = await w.handler.execute({
      leaveRequestId: leaveRequest.id,
      userId: owner.id,
      tenantId: tenant.id,
    } as any);

    expect(result.status).toBe('CANCELLED');
    expect(w.commandBus.executed).toHaveLength(1);
  });

  it('owner can cancel a request still mid-chain (TEAM_LEAD_COMMENTED)', async () => {
    const w = wire();
    const { tenant, owner, leaveRequest } = seedRequest(
      w.prisma,
      'TEAM_LEAD_COMMENTED',
    );

    const result = await w.handler.execute({
      leaveRequestId: leaveRequest.id,
      userId: owner.id,
      tenantId: tenant.id,
    } as any);

    expect(result.status).toBe('CANCELLED');
  });

  it('rejects cancellation by someone other than the owner', async () => {
    const w = wire();
    const { tenant, leaveRequest } = seedRequest(w.prisma, 'PENDING');
    const someoneElse = seedUser(w.prisma, {
      tenantId: tenant.id,
      role: 'EMPLOYEE',
    });

    await expect(
      w.handler.execute({
        leaveRequestId: leaveRequest.id,
        userId: someoneElse.id,
        tenantId: tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it.each(['APPROVED', 'REJECTED', 'CANCELLED'])(
    'rejects cancellation once status is %s',
    async (status) => {
      const w = wire();
      const { tenant, owner, leaveRequest } = seedRequest(w.prisma, status);

      await expect(
        w.handler.execute({
          leaveRequestId: leaveRequest.id,
          userId: owner.id,
          tenantId: tenant.id,
        } as any),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('throws NotFoundException for a request outside the tenant', async () => {
    const w = wire();
    const { owner, leaveRequest } = seedRequest(w.prisma, 'PENDING');

    await expect(
      w.handler.execute({
        leaveRequestId: leaveRequest.id,
        userId: owner.id,
        tenantId: 'a_different_tenant',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
