import { getRequest, seedOrg, submitAs, wire } from '../test-utils/wiring';

describe('Flow: Team Lead submits a leave request', () => {
  it('starts pre-commented — own team-lead stage is auto-filled', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.teamLead, org);
    expect(lr.status).toBe('TEAM_LEAD_COMMENTED');
  });

  it('4. Dept Head approves, HR approves', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.teamLead, org);

    await w.deptApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.deptHead.id,
      tenantId: org.tenant.id,
    } as any);
    await w.hrApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.hrAdmin.id,
      tenantId: org.tenant.id,
    } as any);

    expect(getRequest(w, lr.id).status).toBe('APPROVED');
  });

  it('5. Dept Head approves, HR rejects', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.teamLead, org);

    await w.deptApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.deptHead.id,
      tenantId: org.tenant.id,
    } as any);
    await w.reject.execute({
      leaveRequestId: lr.id,
      rejectorId: org.hrAdmin.id,
      tenantId: org.tenant.id,
      reason: 'Not this quarter',
    } as any);

    expect(getRequest(w, lr.id).status).toBe('REJECTED');
  });

  it('6. Dept Head rejects', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.teamLead, org);

    await w.reject.execute({
      leaveRequestId: lr.id,
      rejectorId: org.deptHead.id,
      tenantId: org.tenant.id,
      reason: 'Conflicts with sprint deadline',
    } as any);

    expect(getRequest(w, lr.id).status).toBe('REJECTED');
  });
});
