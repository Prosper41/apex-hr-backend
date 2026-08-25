import { ForbiddenException } from '@nestjs/common';
import { seedOrg, submitAs, wire } from '../test-utils/wiring';
import { seedUser } from '../test-utils/fixtures';

describe('Flow: authorization guards — wrong role, wrong stage, double-action', () => {
  it('Employee cannot call the Team Lead comment action', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.employee, org);

    await expect(
      w.teamLeadComment.execute({
        leaveRequestId: lr.id,
        commenterId: org.employee.id,
        tenantId: org.tenant.id,
        comment: 'Approving my own request via the wrong endpoint',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Dept Head cannot approve before Team Lead has commented', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.employee, org);

    await expect(
      w.deptApprove.execute({
        leaveRequestId: lr.id,
        approverId: org.deptHead.id,
        tenantId: org.tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('HR cannot approve before Dept Head has approved', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.employee, org);

    await w.teamLeadComment.execute({
      leaveRequestId: lr.id,
      commenterId: org.teamLead.id,
      tenantId: org.tenant.id,
      comment: 'Noted',
    } as any);

    await expect(
      w.hrApprove.execute({
        leaveRequestId: lr.id,
        approverId: org.hrAdmin.id,
        tenantId: org.tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('cannot double-approve: Dept Head approving twice throws on the second call', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.employee, org);

    await w.teamLeadComment.execute({
      leaveRequestId: lr.id,
      commenterId: org.teamLead.id,
      tenantId: org.tenant.id,
      comment: 'Noted',
    } as any);
    await w.deptApprove.execute({
      leaveRequestId: lr.id,
      approverId: org.deptHead.id,
      tenantId: org.tenant.id,
    } as any);

    await expect(
      w.deptApprove.execute({
        leaveRequestId: lr.id,
        approverId: org.deptHead.id,
        tenantId: org.tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('an HR Admin outside the designated HR department cannot approve', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);
    const lr = await submitAs(w, org.deptHead, org);

    const rogueHrAdmin = seedUser(w.prisma, {
      tenantId: org.tenant.id,
      role: 'HR_ADMIN',
      departmentId: org.engineering.id, // wrong department — not the tenant's hrDepartmentId
    });

    await expect(
      w.hrApprove.execute({
        leaveRequestId: lr.id,
        approverId: rogueHrAdmin.id,
        tenantId: org.tenant.id,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
