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
import { submitLeaveRequest } from '../../support/helpers/leave-request-actions.helper';

/**
 * Authorization Tests:
 * - Wrong Team Lead attempts approval (different department)
 * - Wrong Department Head attempts approval (different department)
 * - HR Admin from another tenant attempts approval
 * - Employee attempts approval
 * - Team Lead approves another department's request
 * - Department Head approves another department's request
 *
 * A recurring pattern confirmed from the handler code: cross-department /
 * cross-tenant attempts return 404 "Leave request not found" rather than
 * 403 — this is intentional (never confirm existence to an unauthorized
 * actor). Wrong-ROLE attempts (e.g. an Employee calling an approval
 * endpoint) return 403, either from RolesGuard at the controller level or
 * from the handler's own role check.
 */
describe('Leave Request — Authorization (e2e)', () => {
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

  it('should reject a Team Lead from a DIFFERENT department with 404 (masks existence) [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-wrong-tl',
    );
    const otherDept = await createDepartmentFixture(
      prisma,
      org.tenantId,
      'Marketing',
    );
    const wrongTeamLead = await createUserFixture(app, prisma, tracker, {
      tenantId: org.tenantId,
      departmentId: otherDept.id,
      role: Role.TEAM_LEAD,
      labelPrefix: 'auth-wrong-tl-actor',
    });
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;

    // Act
    const response = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${wrongTeamLead.accessToken}`)
      .send({
        comment: 'Attempting to act on a request outside my department.',
      });

    // Assert
    expect(response.status).toBe(404);

    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.status).toBe('PENDING'); // untouched
  });

  it('should reject a Department Head from a DIFFERENT department with 404 (masks existence) [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-wrong-dh',
    );
    const otherDept = await createDepartmentFixture(
      prisma,
      org.tenantId,
      'Operations',
    );
    const wrongDeptHead = await createUserFixture(app, prisma, tracker, {
      tenantId: org.tenantId,
      departmentId: otherDept.id,
      role: Role.DEPT_HEAD,
      labelPrefix: 'auth-wrong-dh-actor',
    });
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
      .set('Authorization', `Bearer ${wrongDeptHead.accessToken}`)
      .send();

    // Assert
    expect(response.status).toBe(404);

    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.status).toBe('TEAM_LEAD_COMMENTED'); // untouched by the wrong actor
  });

  it('should reject an HR Admin from ANOTHER TENANT with 404 (tenant isolation) [High]', async () => {
    // Arrange — two completely separate tenants
    const orgA = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-cross-tenant-a',
    );
    const orgB = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-cross-tenant-b',
    );

    const submit = await submitLeaveRequest(app, orgA.employee.accessToken, {
      leavePolicyId: orgA.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${orgA.teamLead.accessToken}`)
      .send({ comment: 'Forwarding as required.' });
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${orgA.deptHead.accessToken}`)
      .send();

    // Act — Tenant B's HR Admin (their token carries Tenant B's tenantId)
    // attempts to approve Tenant A's leave request
    const response = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${orgB.hrAdmin.accessToken}`)
      .send();

    // Assert
    expect(response.status).toBe(404);

    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.status).toBe('DEPT_APPROVED'); // untouched
  });

  it('should reject an EMPLOYEE attempting any approval action with 403 [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-employee',
    );
    const submit = await submitLeaveRequest(app, org.employee.accessToken, {
      leavePolicyId: org.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;

    // Act - employee attempts team-lead-comment
    const tlAttempt = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${org.employee.accessToken}`)
      .send({ comment: 'I will approve my own request.' });

    // Act - employee attempts dept-approve
    const deptAttempt = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${org.employee.accessToken}`)
      .send();

    // Act - employee attempts hr-approve
    const hrAttempt = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.employee.accessToken}`)
      .send();

    // Act - employee attempts reject
    const rejectAttempt = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/reject`)
      .set('Authorization', `Bearer ${org.employee.accessToken}`)
      .send({ reason: 'Rejecting my own request.' });

    // Assert - RolesGuard blocks all of these at the controller level
    expect(tlAttempt.status).toBe(403);
    expect(deptAttempt.status).toBe(403);
    expect(hrAttempt.status).toBe(403);
    expect(rejectAttempt.status).toBe(403);
  });

  it("should reject a Team Lead attempting to comment on ANOTHER department's request (cross-department) [High]", async () => {
    // This is the same rule as "wrong Team Lead" above, phrased from the
    // routing side: a valid Team Lead attempting to act outside their own
    // department, rather than an attacker with no legitimate role at all.
    const orgA = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-tl-cross-dept-a',
    );
    const deptB = await createDepartmentFixture(prisma, orgA.tenantId, 'Legal');
    const teamLeadB = await createUserFixture(app, prisma, tracker, {
      tenantId: orgA.tenantId,
      departmentId: deptB.id,
      role: Role.TEAM_LEAD,
      labelPrefix: 'auth-tl-cross-dept-b',
    });

    const submit = await submitLeaveRequest(app, orgA.employee.accessToken, {
      leavePolicyId: orgA.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;

    // Act
    const response = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${teamLeadB.accessToken}`)
      .send({ comment: 'Team Lead of an unrelated department.' });

    // Assert
    expect(response.status).toBe(404);
  });

  it("should reject a Department Head attempting to approve ANOTHER department's request (cross-department) [High]", async () => {
    const orgA = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-dh-cross-dept-a',
    );
    const deptB = await createDepartmentFixture(
      prisma,
      orgA.tenantId,
      'Procurement',
    );
    const deptHeadB = await createUserFixture(app, prisma, tracker, {
      tenantId: orgA.tenantId,
      departmentId: deptB.id,
      role: Role.DEPT_HEAD,
      labelPrefix: 'auth-dh-cross-dept-b',
    });

    const submit = await submitLeaveRequest(app, orgA.employee.accessToken, {
      leavePolicyId: orgA.leavePolicyId,
    });
    const leaveRequestId = submit.body.leaveRequest.id;
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${orgA.teamLead.accessToken}`)
      .send({ comment: 'Forwarding as required.' });

    // Act
    const response = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${deptHeadB.accessToken}`)
      .send();

    // Assert
    expect(response.status).toBe(404);
  });

  /**
   * 🚩 Documents a real bug flagged during code review: an HR_ADMIN whose
   * own departmentId does NOT match the tenant's designated HR department
   * (a data-integrity/misconfiguration scenario, or an HR_ADMIN role
   * granted to a user in the wrong department) is correctly BLOCKED by
   * assertHrAdmin — confirming "HR Admins cannot belong to other
   * departments for approval purposes" IS enforced, at least at the point
   * of action.
   */
  it('should reject an HR_ADMIN whose department is NOT the designated HR department [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'auth-misconfigured-hr',
    );
    const misconfiguredHr = await createUserFixture(app, prisma, tracker, {
      tenantId: org.tenantId,
      departmentId: org.workDepartmentId, // NOT the HR department
      role: Role.HR_ADMIN,
      labelPrefix: 'auth-misconfigured-hr-actor',
    });

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
      .set('Authorization', `Bearer ${misconfiguredHr.accessToken}`)
      .send();

    // Assert
    expect(response.status).toBe(403);

    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.status).toBe('DEPT_APPROVED'); // untouched
  });
});
