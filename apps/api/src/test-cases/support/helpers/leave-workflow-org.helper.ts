import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { Role } from '@prisma/client';
import { MockMailService } from '../setup/mail.mock';
import { TestDataTracker } from './test-data-tracker.helper';
import { registerTenant } from './auth-fixtures.helper';
import {
  createDepartmentFixture,
  createHrDepartmentFixture,
} from './department-fixtures.helper';
import { createUserFixture, UserFixture } from './user-fixtures.helper';
import { createLeavePolicyFixture } from './leave-policy-fixtures.helper';
import { grantLeaveBalanceFixture } from './leave-balance-fixtures.helper';

export interface LeaveWorkflowOrg {
  tenantId: string;
  tenantAdmin: UserFixture;
  hrDepartmentId: string;
  hrAdmin: UserFixture;
  workDepartmentId: string;
  employee: UserFixture;
  teamLead: UserFixture;
  deptHead: UserFixture;
  leavePolicyId: string;
}

/**
 * Builds one complete, valid organization exactly matching the documented
 * Initial Setup flow:
 *   tenant -> HR department -> HR Admin -> work department
 *   -> employee / team lead / dept head -> leave policy -> leave balance
 *
 * This is the single Arrange building block nearly every leave-request
 * test starts from. Individual tests then deviate from this baseline
 * (wrong department, wrong tenant, missing balance, etc.) to isolate one
 * specific rule.
 */
export async function buildLeaveWorkflowOrg(
  app: INestApplication,
  prisma: PrismaService,
  mailService: MockMailService,
  tracker: TestDataTracker,
  labelPrefix: string,
  workDepartmentName = 'Sales',
): Promise<LeaveWorkflowOrg> {
  // Step 1: Tenant Admin creates the company.
  const tenant = await registerTenant(
    app,
    mailService,
    tracker,
    `${labelPrefix}-tenant-admin`,
  );
  const tenantAdminRow = await prisma.user.findUniqueOrThrow({
    where: { email: tenant.email },
  });
  const tenantAdmin: UserFixture = {
    id: tenantAdminRow.id,
    email: tenantAdminRow.email,
    role: tenantAdminRow.role,
    departmentId: tenantAdminRow.departmentId,
    tenantId: tenant.tenantId,
    accessToken: tenant.accessToken,
  };

  // Step 2: Tenant Admin creates the HR Department.
  const hrDepartment = await createHrDepartmentFixture(prisma, tenant.tenantId);

  // Step 3: Tenant Admin creates an HR Admin, assigned to the HR Department.
  const hrAdmin = await createUserFixture(app, prisma, tracker, {
    tenantId: tenant.tenantId,
    departmentId: hrDepartment.id,
    role: Role.HR_ADMIN,
    labelPrefix: `${labelPrefix}-hr-admin`,
  });

  // Step 4: HR Admin creates all other departments.
  const workDepartment = await createDepartmentFixture(
    prisma,
    tenant.tenantId,
    workDepartmentName,
  );

  // Step 5: HR Admin creates employees and assigns department/team
  // lead/dept head/role. (Team Lead and Dept Head are themselves users
  // with those roles, sharing the work department's departmentId — there
  // is no separate assignment field; see leave-request-access.helper.ts.)
  const teamLead = await createUserFixture(app, prisma, tracker, {
    tenantId: tenant.tenantId,
    departmentId: workDepartment.id,
    role: Role.TEAM_LEAD,
    labelPrefix: `${labelPrefix}-team-lead`,
  });

  const deptHead = await createUserFixture(app, prisma, tracker, {
    tenantId: tenant.tenantId,
    departmentId: workDepartment.id,
    role: Role.DEPT_HEAD,
    labelPrefix: `${labelPrefix}-dept-head`,
  });

  const employee = await createUserFixture(app, prisma, tracker, {
    tenantId: tenant.tenantId,
    departmentId: workDepartment.id,
    role: Role.EMPLOYEE,
    labelPrefix: `${labelPrefix}-employee`,
  });

  // Step 6: Employees are allocated leave balances (via a leave policy).
  const leavePolicy = await createLeavePolicyFixture(prisma, tenant.tenantId);

  await grantLeaveBalanceFixture(prisma, {
    tenantId: tenant.tenantId,
    employeeId: employee.id,
    leavePolicyId: leavePolicy.id,
    amount: 20,
  });

  return {
    tenantId: tenant.tenantId,
    tenantAdmin,
    hrDepartmentId: hrDepartment.id,
    hrAdmin,
    workDepartmentId: workDepartment.id,
    employee,
    teamLead,
    deptHead,
    leavePolicyId: leavePolicy.id,
  };
}
