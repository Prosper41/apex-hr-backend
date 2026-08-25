import { NotFoundException } from '@nestjs/common';
import { seedOrg, wire } from '../test-utils/wiring';
import { seedAvailableBalance, seedUser } from '../test-utils/fixtures';

describe('Flow: department scoping — actor with null departmentId', () => {
  /**
   * KNOWN BUG at time of writing: `departmentId: teamLead.departmentId ?? undefined`
   * in TeamLeadCommentLeaveRequestHandler (and the equivalent pattern in
   * DeptApproveLeaveRequestHandler / RejectLeaveRequestHandler) drops the
   * department filter entirely when departmentId is null, instead of
   * denying access. This test documents the CORRECT behavior and will fail
   * against the current handler until it's patched to treat a null
   * departmentId as "no access" rather than "unscoped access".
   */
  it("a Team Lead with no assigned department cannot comment on another department's request", async () => {
    const w = wire();
    const org = seedOrg(w.prisma);

    const otherDept = { id: 'dept_other' };
    const outsider = seedUser(w.prisma, {
      tenantId: org.tenant.id,
      role: 'EMPLOYEE',
      departmentId: otherDept.id,
    });
    seedAvailableBalance(w.prisma, {
      tenantId: org.tenant.id,
      employeeId: outsider.id,
      leavePolicyId: org.policy.id,
      amount: 21,
    });

    const otherDeptRequest = await w.submit.execute({
      submitLeaveRequestDto: {
        leavePolicyId: org.policy.id,
        departmentId: otherDept.id,
        startDate: '2027-03-01',
        endDate: '2027-03-03',
        isHalfDay: false,
        reason: 'Personal',
      },
      tenantId: org.tenant.id,
      userId: outsider.id,
    } as any);

    const unassignedTeamLead = seedUser(w.prisma, {
      tenantId: org.tenant.id,
      role: 'TEAM_LEAD',
      departmentId: null,
    });

    await expect(
      w.teamLeadComment.execute({
        leaveRequestId: otherDeptRequest.leaveRequest.id,
        commenterId: unassignedTeamLead.id,
        tenantId: org.tenant.id,
        comment: 'I should not be able to see this',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
