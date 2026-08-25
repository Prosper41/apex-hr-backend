import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { buildLeaveWorkflowOrg } from '../../support/helpers/leave-workflow-org.helper';
import { submitLeaveRequest } from '../../support/helpers/leave-request-actions.helper';

/**
 * Rejection Paths:
 * - Department Head rejects (at TEAM_LEAD_COMMENTED stage)
 * - HR rejects (at DEPT_APPROVED stage)
 * - Tenant Admin rejects (at DEPT_APPROVED stage — controller allows this)
 * - Workflow stops immediately after rejection (no further stage action possible)
 *
 * Note: these tests assert on `status` transitions and comment records,
 * which are directly verified from the handler code reviewed. They do NOT
 * assert on leave-balance-ledger reversal details, since
 * ReleaseLeaveBalanceHandler's implementation was not reviewed — asserting
 * on unverified internals would be guessing at the test oracle rather than
 * checking known behavior.
 */
describe('Leave Request — Rejection Paths (e2e)', () => {
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

  it('should allow a Department Head to reject at the TEAM_LEAD_COMMENTED stage [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'reject-dh',
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
    const rejectResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/reject`)
      .set('Authorization', `Bearer ${org.deptHead.accessToken}`)
      .send({ reason: 'Insufficient staffing coverage during this period.' });

    // Assert - API response
    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.leaveRequest.status).toBe('REJECTED');

    // Assert - DB
    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.status).toBe('REJECTED');

    // Assert - a rejection comment was recorded
    const comment = await prisma.leaveRequestComment.findFirst({
      where: { leaveRequestId, authorId: org.deptHead.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(comment!.comment).toMatch(/rejected/i);
  });

  it('should allow HR Admin to reject at the DEPT_APPROVED stage [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'reject-hr',
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
    const rejectResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/reject`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send({ reason: 'Conflicts with a company-wide blackout period.' });

    // Assert
    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.leaveRequest.status).toBe('REJECTED');

    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.status).toBe('REJECTED');
  });

  it('should allow Tenant Admin to reject at the DEPT_APPROVED stage [Medium]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'reject-ta',
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
    const rejectResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/reject`)
      .set('Authorization', `Bearer ${org.tenantAdmin.accessToken}`)
      .send({ reason: 'Overriding as Tenant Admin.' });

    // Assert
    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.leaveRequest.status).toBe('REJECTED');
  });

  it('should stop the workflow immediately after rejection — no further stage action is possible [High]', async () => {
    // Arrange: reject at the Dept Head stage
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'reject-stops',
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
      .patch(`/v1/leave-requests/${leaveRequestId}/reject`)
      .set('Authorization', `Bearer ${org.deptHead.accessToken}`)
      .send({ reason: 'Rejected at Dept Head stage.' });

    // Act - attempt to dept-approve a REJECTED request
    const deptApproveAfterReject = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${org.deptHead.accessToken}`)
      .send();

    // Act - attempt to hr-approve a REJECTED request
    const hrApproveAfterReject = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send();

    // Act - attempt to reject an already-REJECTED request again
    const rejectAgain = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/reject`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send({ reason: 'Trying to reject twice.' });

    // Assert - every further action on a REJECTED request is refused
    expect(deptApproveAfterReject.status).toBe(403);
    expect(hrApproveAfterReject.status).toBe(403);
    expect(rejectAgain.status).toBe(403);

    // Assert - status is still REJECTED, unchanged by the failed attempts
    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.status).toBe('REJECTED');
  });
});
