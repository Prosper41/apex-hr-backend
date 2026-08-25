import { ForbiddenException } from '@nestjs/common';
import { getRequest, seedOrg, submitAs, wire } from '../test-utils/wiring';

describe('Flow: HR Admin submits a leave request', () => {
  it('starts pre-approved at DEPT_APPROVED, same as Dept Head', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.hrAdmin, org);
    expect(lr.status).toBe('DEPT_APPROVED');
  });

  it('9. HR cannot approve their own request; Tenant Admin can', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.hrAdmin, org);

    await expect(
      w.hrApprove.execute({
        leaveRequestId: lr.id,
        approverId: org.hrAdmin.id,
        tenantId: org.tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(getRequest(w, lr.id).status).toBe('DEPT_APPROVED');

    await w.hrApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.tenantAdmin.id,
      tenantId: org.tenant.id,
    } as any);

    expect(getRequest(w, lr.id).status).toBe('APPROVED');
  });

  it('10. HR cannot reject their own request; Tenant Admin can', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.hrAdmin, org);

    await expect(
      w.reject.execute({
        leaveRequestId: lr.id,
        rejectorId: org.hrAdmin.id,
        tenantId: org.tenant.id,
        reason: 'Self-review',
      } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(getRequest(w, lr.id).status).toBe('DEPT_APPROVED');

    await w.reject.execute({
      leaveRequestId: lr.id,
      rejectorId: org.tenantAdmin.id,
      tenantId: org.tenant.id,
      reason: 'Declined by Tenant Admin',
    } as any);

    expect(getRequest(w, lr.id).status).toBe('REJECTED');
  });
});
