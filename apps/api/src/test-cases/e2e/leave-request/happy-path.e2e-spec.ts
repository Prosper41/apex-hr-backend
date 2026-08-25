import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';
import { createTestApp } from '../../support/setup/create-test-app';
import { MockMailService } from '../../support/setup/mail.mock';
import { TestDataTracker } from '../../support/helpers/test-data-tracker.helper';
import { buildLeaveWorkflowOrg } from '../../support/helpers/leave-workflow-org.helper';
import { createUserFixture } from '../../support/helpers/user-fixtures.helper';
import { submitLeaveRequest } from '../../support/helpers/leave-request-actions.helper';
import { grantLeaveBalanceFixture } from '../../support/helpers/leave-balance-fixtures.helper';
import { createDepartmentFixture } from '../../support/helpers/department-fixtures.helper';

/**
 * Happy Paths:
 * - Full 3-stage workflow (Employee -> Team Lead -> Dept Head -> HR Admin)
 * - Every role submitting leave (Employee, Team Lead, Dept Head, HR Admin)
 * - Multiple departments routing independently
 * - Multiple HR Admins (one submits, a different one approves)
 */
describe('Leave Request — Happy Paths (e2e)', () => {
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

  it('should complete the full 3-stage workflow for an EMPLOYEE submission [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'happy-full',
    );

    // Act — Stage 0: Employee submits
    const submitResponse = await submitLeaveRequest(
      app,
      org.employee.accessToken,
      {
        leavePolicyId: org.leavePolicyId,
      },
    );

    // Assert — Stage 0
    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.leaveRequest.status).toBe('PENDING');
    const leaveRequestId = submitResponse.body.leaveRequest.id;

    // Act — Stage 1: Team Lead comments
    const tlResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/team-lead-comment`)
      .set('Authorization', `Bearer ${org.teamLead.accessToken}`)
      .send({ comment: 'Approved from a staffing perspective.' });

    // Assert — Stage 1
    expect(tlResponse.status).toBe(200);
    expect(tlResponse.body.leaveRequest.status).toBe('TEAM_LEAD_COMMENTED');
    expect(tlResponse.body.leaveRequest.teamLeadApprover.id).toBe(
      org.teamLead.id,
    );

    // Act — Stage 2: Dept Head approves
    const deptResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${org.deptHead.accessToken}`)
      .send();

    // Assert — Stage 2
    expect(deptResponse.status).toBe(200);
    expect(deptResponse.body.leaveRequest.status).toBe('DEPT_APPROVED');
    expect(deptResponse.body.leaveRequest.deptApprover.id).toBe(
      org.deptHead.id,
    );

    // Act — Stage 3: HR Admin gives final approval
    const hrResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send();

    // Assert — Stage 3: final state
    expect(hrResponse.status).toBe(200);
    expect(hrResponse.body.leaveRequest.status).toBe('APPROVED');

    // Assert — DB: final row reflects every approver correctly
    const finalRow = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(finalRow!.status).toBe('APPROVED');
    expect(finalRow!.teamLeadApproverId).toBe(org.teamLead.id);
    expect(finalRow!.deptApproverId).toBe(org.deptHead.id);
    expect(finalRow!.hrApproverId).toBe(org.hrAdmin.id);

    // Assert — audit trail via comments (Team Lead comment + HR final comment
    // are both written by the handlers as LeaveRequestComment rows)
    const comments = await prisma.leaveRequestComment.findMany({
      where: { leaveRequestId },
      orderBy: { createdAt: 'asc' },
    });
    expect(comments.length).toBeGreaterThanOrEqual(2);
  });

  it('should auto-skip the Team Lead stage when a TEAM_LEAD submits their own leave [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'happy-tl-submits',
    );
    // Team Lead needs their own leave balance to submit.
    await grantLeaveBalanceFixture(prisma, {
      tenantId: org.tenantId,
      employeeId: org.teamLead.id,
      leavePolicyId: org.leavePolicyId,
      amount: 20,
    });

    // Act
    const submitResponse = await submitLeaveRequest(
      app,
      org.teamLead.accessToken,
      {
        leavePolicyId: org.leavePolicyId,
      },
    );

    // Assert — jumps straight to TEAM_LEAD_COMMENTED, self-recorded
    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.leaveRequest.status).toBe('TEAM_LEAD_COMMENTED');
    expect(submitResponse.body.leaveRequest.teamLeadApprover.id).toBe(
      org.teamLead.id,
    );
    const leaveRequestId = submitResponse.body.leaveRequest.id;

    // Act — Dept Head can now approve directly (Team Lead stage was skipped)
    const deptResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/dept-approve`)
      .set('Authorization', `Bearer ${org.deptHead.accessToken}`)
      .send();

    expect(deptResponse.status).toBe(200);
    expect(deptResponse.body.leaveRequest.status).toBe('DEPT_APPROVED');
  });

  it('should auto-skip Team Lead AND Dept Head stages when a DEPT_HEAD submits their own leave [High]', async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'happy-dh-submits',
    );
    await grantLeaveBalanceFixture(prisma, {
      tenantId: org.tenantId,
      employeeId: org.deptHead.id,
      leavePolicyId: org.leavePolicyId,
      amount: 20,
    });

    // Act
    const submitResponse = await submitLeaveRequest(
      app,
      org.deptHead.accessToken,
      {
        leavePolicyId: org.leavePolicyId,
      },
    );

    // Assert — jumps straight to DEPT_APPROVED, self-recorded at both stages
    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.leaveRequest.status).toBe('DEPT_APPROVED');
    const leaveRequestId = submitResponse.body.leaveRequest.id;

    const row = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });
    expect(row!.teamLeadApproverId).toBe(org.deptHead.id);
    expect(row!.deptApproverId).toBe(org.deptHead.id);

    // Act — HR can now approve directly
    const hrResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send();

    expect(hrResponse.status).toBe(200);
    expect(hrResponse.body.leaveRequest.status).toBe('APPROVED');
  });

  it("should route an HR_ADMIN's own leave to a DIFFERENT HR Admin for approval (multiple HR Admins) [High]", async () => {
    // Arrange
    const org = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'happy-multi-hr',
    );
    const secondHrAdmin = await createUserFixture(app, prisma, tracker, {
      tenantId: org.tenantId,
      departmentId: org.hrDepartmentId,
      role: Role.HR_ADMIN,
      labelPrefix: 'happy-multi-hr-second',
    });
    await grantLeaveBalanceFixture(prisma, {
      tenantId: org.tenantId,
      employeeId: org.hrAdmin.id,
      leavePolicyId: org.leavePolicyId,
      amount: 20,
    });

    // Act — the first HR Admin submits their own leave (auto DEPT_APPROVED)
    const submitResponse = await submitLeaveRequest(
      app,
      org.hrAdmin.accessToken,
      {
        leavePolicyId: org.leavePolicyId,
      },
    );
    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.leaveRequest.status).toBe('DEPT_APPROVED');
    const leaveRequestId = submitResponse.body.leaveRequest.id;

    // Act — the SAME HR Admin tries to approve their own request: must fail
    const selfApproveResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${org.hrAdmin.accessToken}`)
      .send();
    expect(selfApproveResponse.status).toBe(403);

    // Act — the SECOND HR Admin (also in the HR department) approves instead
    const secondApproveResponse = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${leaveRequestId}/hr-approve`)
      .set('Authorization', `Bearer ${secondHrAdmin.accessToken}`)
      .send();

    // Assert
    expect(secondApproveResponse.status).toBe(200);
    expect(secondApproveResponse.body.leaveRequest.status).toBe('APPROVED');
  });

  it("should route two different departments' requests independently to their own Team Lead/Dept Head, converging on the same HR Admin [High]", async () => {
    // Arrange — two separate work departments under one org
    const orgA = await buildLeaveWorkflowOrg(
      app,
      prisma,
      mailService,
      tracker,
      'happy-multi-dept-a',
      'Sales',
    );

    // Reuse orgA's tenant/HR setup, but add a second work department + staff
    const deptB = await createDepartmentFixture(
      prisma,
      orgA.tenantId,
      'Finance',
    );
    const teamLeadB = await createUserFixture(app, prisma, tracker, {
      tenantId: orgA.tenantId,
      departmentId: deptB.id,
      role: Role.TEAM_LEAD,
      labelPrefix: 'happy-multi-dept-b-tl',
    });
    const deptHeadB = await createUserFixture(app, prisma, tracker, {
      tenantId: orgA.tenantId,
      departmentId: deptB.id,
      role: Role.DEPT_HEAD,
      labelPrefix: 'happy-multi-dept-b-dh',
    });
    const employeeB = await createUserFixture(app, prisma, tracker, {
      tenantId: orgA.tenantId,
      departmentId: deptB.id,
      role: Role.EMPLOYEE,
      labelPrefix: 'happy-multi-dept-b-emp',
    });
    await grantLeaveBalanceFixture(prisma, {
      tenantId: orgA.tenantId,
      employeeId: employeeB.id,
      leavePolicyId: orgA.leavePolicyId,
      amount: 20,
    });

    // Act — Department A's employee submits and routes through A's chain
    const submitA = await submitLeaveRequest(app, orgA.employee.accessToken, {
      leavePolicyId: orgA.leavePolicyId,
    });
    const idA = submitA.body.leaveRequest.id;

    // Act — Department B's employee submits and routes through B's chain
    const submitB = await submitLeaveRequest(app, employeeB.accessToken, {
      leavePolicyId: orgA.leavePolicyId,
    });
    const idB = submitB.body.leaveRequest.id;

    // Assert — Department A's Team Lead can act on A but NOT on B
    const tlOnA = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${idA}/team-lead-comment`)
      .set('Authorization', `Bearer ${orgA.teamLead.accessToken}`)
      .send({ comment: 'Dept A team lead handling dept A request.' });
    expect(tlOnA.status).toBe(200);

    const tlAOnB = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${idB}/team-lead-comment`)
      .set('Authorization', `Bearer ${orgA.teamLead.accessToken}`)
      .send({ comment: 'Should not be able to touch dept B request.' });
    expect(tlAOnB.status).toBe(404);

    // Assert — Department B's Team Lead handles B correctly
    const tlOnB = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${idB}/team-lead-comment`)
      .set('Authorization', `Bearer ${teamLeadB.accessToken}`)
      .send({ comment: 'Dept B team lead handling dept B request.' });
    expect(tlOnB.status).toBe(200);

    // Act — advance both to DEPT_APPROVED via their own Dept Heads
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${idA}/dept-approve`)
      .set('Authorization', `Bearer ${orgA.deptHead.accessToken}`)
      .send();
    await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${idB}/dept-approve`)
      .set('Authorization', `Bearer ${deptHeadB.accessToken}`)
      .send();

    // Assert — both converge on the SAME single HR Admin for final approval
    const hrOnA = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${idA}/hr-approve`)
      .set('Authorization', `Bearer ${orgA.hrAdmin.accessToken}`)
      .send();
    const hrOnB = await request(app.getHttpServer())
      .patch(`/v1/leave-requests/${idB}/hr-approve`)
      .set('Authorization', `Bearer ${orgA.hrAdmin.accessToken}`)
      .send();

    expect(hrOnA.status).toBe(200);
    expect(hrOnA.body.leaveRequest.status).toBe('APPROVED');
    expect(hrOnB.status).toBe(200);
    expect(hrOnB.body.leaveRequest.status).toBe('APPROVED');
  });
});
