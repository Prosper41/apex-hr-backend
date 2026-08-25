import { getRequest, seedOrg, submitAs, wire } from '../test-utils/wiring';

describe('Flow: Tenant Admin self-action (intentional — no one sits above them)', () => {
  it('can submit and approve their own leave request', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.tenantAdmin, org);
    expect(lr.status).toBe('DEPT_APPROVED');

    await w.hrApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.tenantAdmin.id,
      tenantId: org.tenant.id,
    } as any);

    expect(getRequest(w, lr.id).status).toBe('APPROVED');
  });

  it('can submit and reject their own leave request', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.tenantAdmin, org);

    await w.reject.execute({
      leaveRequestId: lr.id,
      rejectorId: org.tenantAdmin.id,
      tenantId: org.tenant.id,
      reason: 'Changed my mind',
    } as any);

    expect(getRequest(w, lr.id).status).toBe('REJECTED');
  });
});
