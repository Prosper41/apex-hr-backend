import { getRequest, seedOrg, submitAs, wire } from '../test-utils/wiring';

describe('Flow: Dept Head submits a leave request', () => {
  it('starts pre-approved — own team-lead and dept-head stages are auto-filled, routes straight to HR', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.deptHead, org);
    expect(lr.status).toBe('DEPT_APPROVED');
  });

  it('7. HR approves', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.deptHead, org);

    await w.hrApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.hrAdmin.id,
      tenantId: org.tenant.id,
    } as any);

    expect(getRequest(w, lr.id).status).toBe('APPROVED');
  });

  it('8. HR rejects', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.deptHead, org);

    await w.reject.execute({
      leaveRequestId: lr.id,
      rejectorId: org.hrAdmin.id,
      tenantId: org.tenant.id,
      reason: 'Insufficient notice',
    } as any);

    expect(getRequest(w, lr.id).status).toBe('REJECTED');
  });
});
