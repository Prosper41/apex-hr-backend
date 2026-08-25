import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { buildLeaveWorkflowOrg } from '../../support/helpers/leave-workflow-org.helper';
import { createUserFixture } from '../../support/helpers/user-fixtures.helper';
import { createDepartmentFixture } from '../../support/helpers/department-fixtures.helper';
import { grantLeaveBalanceFixture } from '../../support/helpers/leave-balance-fixtures.helper';
import { submitLeaveRequest } from '../../support/helpers/leave-request-actions.helper';

/**
 * Routing Tests:
 * - Leave routes to the correct Team Lead
 * - Leave routes to the correct Department Head
 * - Leave always routes to an HR Admin in the HR Department
 * - HR Admin leave routes to Tenant Admin (or another qualifying HR Admin —
 *   see the note on the "hr-to-ta" test in this file)
 * - departmentId can no longer be used by the client to spoof routing
 *   (fix verification — this was previously a documented High-priority
 *   bug). Note: the field remains REQUIRED in the DTO for frontend
 *   backward compatibility; only its VALUE is now ignored server-side.
 *
 * Routing mechanism confirmed from leave-request-access.helper.ts: there is
 * no explicit "assigned" Team Lead/Dept Head field anywhere. At each stage,
 * the handler simply asks "does a user with role X exist whose
 * departmentId matches this leave request's departmentId?" — so if a
 * department has multiple Team Leads, whichever one acts first succeeds.
 */
describe('Leave Request — Routing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MockMailService;
  const tracker = new TestDataTracker();

  beforeAll(async () => {
    ({ app, prisma, mailService } = await createTestApp());
  });

  afterAll(async () => {
    await tracker.cleanup(prisma);
    await app.close();
  });

  it('should route to the correct Team Lead by shared departmentId [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-tl',
    );
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;

    // Act
    const response = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${org.teamLead.accessToken}`)
      .send({ comment: 'The correct Team Lead for this department.' });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.leaveRequest.teamLeadApprover.id).toBe(
      org.teamLead.id,
    );
  });

  it('when a department has MULTIPLE Team Leads, any one of them may act — but only once [Medium]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-multi-tl',
    );
    const secondTeamLead = await createUserFixture(app, prisma, tracker, {
      tenantId: org.tenantId,
      departmentId: org.workDepartmentId,
      role: Role.TEAM_LEAD,
      labelPrefix: 'routing-multi-tl-second',
    });
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;

    // Act — the first Team Lead comments
    const firstResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${org.teamLead.accessToken}`)
      .send({ comment: 'First team lead to respond.' });

    // Act — the second Team Lead tries afterward
    const secondResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${secondTeamLead.accessToken}`)
      .send({ comment: 'Second team lead, too late.' });

    // Assert — first succeeds, second is blocked because status has moved on
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(403);
  });

  it('should route to the correct Department Head by shared departmentId [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-dh',
    );
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${org.teamLead.accessToken}`)
      .send({ comment: 'Forwarding as required.' });

    // Act
    const response = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${org.deptHead.accessToken}`)
      .send();

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.leaveRequest.deptApprover.id).toBe(org.deptHead.id);
  });

  it('should always route to an HR Admin belonging to the designated HR Department, never any other department [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-hr-dept',
    );
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${org.teamLead.accessToken}`)
      .send({ comment: 'Forwarding as required.' });
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${org.deptHead.accessToken}`)
      .send();

    // Act
    const response = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send();

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.leaveRequest.status).toBe('APPROVED');

    // Assert - the approver on record really is in the HR department
    const hrApproverRow = await prisma.user.findUnique({
      where: { id: org.hrAdmin.id },
    });
    const tenantRow = await prisma.tenant.findUnique({
      where: { id: org.tenantId },
    });
    expect(hrApproverRow!.departmentId).toBe(tenantRow!.hrDepartmentId);
  });

  it("an HR_ADMIN's own leave request routes to another qualifying HR Admin or Tenant Admin, never self [High]", async () => {
    // Confirms the documented business rule "HR Admin -> Tenant Admin" at
    // the top of the chain. Per the reviewed code, the self-approval guard
    // specifically blocks role === 'HR_ADMIN' approving their own request;
    // Tenant Admin approving is explicitly allowed and was confirmed as
    // intended behavior. A second HR Admin in the HR department is ALSO
    // permitted by the current code (assertHrAdmin does not exclude
    // "any other HR admin") — this test documents that as current,
    // accepted behavior consistent with the "Multiple HR Admins" happy path.
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-hr-to-ta',
    );
    await grantLeaveBalanceFixture(prisma, {
      tenantId: org.tenantId,
      employeeId: org.hrAdmin.id,
      leavePolicyId: org.leavePolicyId,
      amount: 20,
    });

    const submit = await submitLeaveRequest(app, org.hrAdmin.accessToken, {
      leavePolicyId: org.leavePolicyId,
    });
    expect(submit.body.leaveRequest.status).toBe('DEPT_APPROVED');
    const leaveRequestId = submit.body.leaveRequest.id;

    // Act — self-approval is blocked
    const selfAttempt = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send();
    expect(selfAttempt.status).toBe(403);

    // Act — Tenant Admin can approve it directly
    const tenantAdminApproval = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.tenantAdmin.accessToken}`)
      .send();

    // Assert
    expect(tenantAdminApproval.status).toBe(200);
    expect(tenantAdminApproval.body.leaveRequest.status).toBe('APPROVED');
  });

  /**
   * FIX VERIFICATION (High) — was previously a documented bug:
   * SubmitLeaveRequestHandler used to take the `departmentId` sent in the
   * request body at face value, letting an employee route their own
   * request to any department they chose. The fix keeps `departmentId`
   * REQUIRED in SubmitLeaveRequestDto (so the existing frontend contract
   * is unchanged), but the handler now ignores whatever value the client
   * sends and always derives the real departmentId from the submitter's
   * own user record.
   */
  it("should ignore a client-supplied departmentId and always derive it from the submitter's own record [High]", async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-fix-dept',
    );
    const foreignDept = await createDepartmentFixture(
      prisma,
      org.tenantId,
      'Legal',
    );
    const foreignTeamLead = await createUserFixture(app, prisma, tracker, {
      tenantId: org.tenantId,
      departmentId: foreignDept.id,
      role: Role.TEAM_LEAD,
      labelPrefix: 'routing-fix-foreign-tl',
    });

    // Act — deliberately send a DIFFERENT, real department's id in the
    // body, attempting to spoof routing.
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
      departmentId: foreignDept.id,
    });

    // Assert — the request is still created successfully (the field passed
    // DTO validation), but routed to the employee's REAL department,
    // completely ignoring the spoofed value.
    expect(submit.status).toBe(201);
    expect(submit.body.leaveRequest.departmentId).toBe(org.workDepartmentId);
    expect(submit.body.leaveRequest.departmentId).not.toBe(foreignDept.id);
    const leaveRequestId = submit.body.leaveRequest.id;

    // The employee's real Team Lead CAN act on it...
    const realTeamLeadAttempt = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${org.teamLead.accessToken}`)
      .send({ comment: 'Correctly routed to me.' });
    expect(realTeamLeadAttempt.status).toBe(200);

    // ...while the Team Lead of the department the client TRIED to spoof
    // still has no access, since routing was never actually influenced by it.
    const foreignTeamLeadAttempt = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${foreignTeamLead.accessToken}`)
      .send({ comment: 'Should never have access to this.' });
    expect(foreignTeamLeadAttempt.status).toBe(404);
  });

  it('should still accept the request when departmentId is an arbitrary non-empty string, since only its presence is validated [Medium]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-fix-garbage-dept',
    );

    // Act — departmentId is not even a real department id, just any
    // non-empty string, satisfying @IsString @IsNotEmpty.
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
      departmentId: 'this-is-not-a-real-department-id',
    });

    // Assert — DTO validation passes (shape only), and real routing still
    // correctly resolves to the submitter's actual department.
    expect(submit.status).toBe(201);
    expect(submit.body.leaveRequest.departmentId).toBe(org.workDepartmentId);
  });

  it('should reject the request with 400 when departmentId is missing entirely (still required by the DTO) [Medium]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'routing-fix-missing-dept',
    );
    const range = { startDate: '2027-02-01', endDate: '2027-02-02' };

    // Act — omit departmentId entirely, unlike the helper's default behavior.
    const response = await request(app.getHttpServer())
      .post('/v1/leave-requests')
      .set('Authorization', `Bearer ${org.employee.accessToken}`)
      .send({
        leavePolicyId: org.leavePolicyId,
        startDate: range.startDate,
        endDate: range.endDate,
        reason: 'Missing departmentId entirely, should fail validation.',
      });

    // Assert — DTO still requires the field to be present, even though its
    // value is ignored once validation passes.
    expect(response.status).toBe(400);
  });
});
