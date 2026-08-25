import { getRequest, seedOrg, submitAs, wire } from '../test-utils/wiring';

describe('Flow: Employee submits a leave request', () => {
  it('1. full chain approves — Team Lead comments, Dept Head approves, HR approves', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.employee, org);
    expect(lr.status).toBe('PENDING');

    await w.teamLeadComment.execute({
      leaveRequestId: lr.id,
      commenterId: org.teamLead.id,
      tenantId: org.tenant.id,
      comment: 'Looks fine to me',
    } as any);

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

  it('2. HR rejects after Dept Head approval', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.employee, org);

    await w.teamLeadComment.execute({
      leaveRequestId: lr.id,
      commenterId: org.teamLead.id,
      tenantId: org.tenant.id,
      comment: 'Fine by me',
    } as any);
    await w.deptApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.deptHead.id,
      tenantId: org.tenant.id,
    } as any);
    await w.reject.execute({
      leaveRequestId: lr.id,
      rejectorId: org.hrAdmin.id,
      tenantId: org.tenant.id,
      reason: 'Coverage gap',
    } as any);

    expect(getRequest(w, lr.id).status).toBe('REJECTED');
  });

  it('3. Dept Head rejects after Team Lead comment', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.employee, org);

    await w.teamLeadComment.execute({
      leaveRequestId: lr.id,
      commenterId: org.teamLead.id,
      tenantId: org.tenant.id,
      comment: 'Noted',
    } as any);
    await w.reject.execute({
      leaveRequestId: lr.id,
      rejectorId: org.deptHead.id,
      tenantId: org.tenant.id,
      reason: 'Team understaffed that week',
    } as any);

    expect(getRequest(w, lr.id).status).toBe('REJECTED');
  });
});
