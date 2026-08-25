import { SubmitLeaveRequestHandler } from 'modules/leave-request/cqrs/handlers/submit-leave-request.handler';
import { TeamLeadCommentLeaveRequestHandler } from 'modules/leave-request/cqrs/handlers/team-lead-comment-leave-request.handler';
import { DeptApproveLeaveRequestHandler } from 'modules/leave-request/cqrs/handlers/dept-approve-leave-request.handler';
import { HrApproveLeaveRequestHandler } from 'modules/leave-request/cqrs/handlers/hr-approve-leave-request.handler';
import { RejectLeaveRequestHandler } from 'modules/leave-request/cqrs/handlers/reject-leave-request.handler';

import { FakePrismaService } from './fake-prisma';

import {
  FakeCommandBus,
  FakeConflictDetectionService,
  FakeQueue,
  FakeRedisService,
} from './fakes';

import {
  seedAvailableBalance,
  seedLeavePolicy,
  seedTenant,
  seedUser,
  TEST_LEAVE_DATES,
} from './fixtures';

/**
 * ASSUMPTION:
 *
 * Command classes are constructed elsewhere (for example, controllers)
 * and simply carry the properties each handler destructures.
 *
 * Handlers here are exercised directly with plain object literals shaped
 * to match the expected command structure.
 *
 * This is a handler-level integration test, not a full E2E test.
 *
 * Adjust the `as any` casts at call sites if your command constructors
 * enforce a different shape.
 */

/**
 * Contains all dependencies and handlers required by the tests.
 */
export interface Wiring {
  prisma: FakePrismaService;
  redis: FakeRedisService;
  queue: FakeQueue;
  commandBus: FakeCommandBus;
  conflictDetection: FakeConflictDetectionService;

  submit: SubmitLeaveRequestHandler;
  teamLeadComment: TeamLeadCommentLeaveRequestHandler;
  deptApprove: DeptApproveLeaveRequestHandler;
  hrApprove: HrApproveLeaveRequestHandler;
  reject: RejectLeaveRequestHandler;
}

/**
 * Creates fresh handler and fake infrastructure instances.
 *
 * Call this once per test so that each test starts with clean state.
 */
export function wire(): Wiring {
  const prisma = new FakePrismaService();
  const redis = new FakeRedisService();
  const queue = new FakeQueue();
  const commandBus = new FakeCommandBus();
  const conflictDetection = new FakeConflictDetectionService();

  const submit = new SubmitLeaveRequestHandler(
    prisma as any,
    commandBus as any,
    conflictDetection as any,
    redis as any,
  );

  const teamLeadComment = new TeamLeadCommentLeaveRequestHandler(
    prisma as any,
    redis as any,
    queue as any,
  );

  const deptApprove = new DeptApproveLeaveRequestHandler(
    prisma as any,
    conflictDetection as any,
    redis as any,
    queue as any,
  );

  // TODO: HrApproveLeaveRequestHandler's real constructor is
  // (prisma, routing: LeaveApprovalRoutingService, auth: LeaveReviewAuthorizationService,
  //  balance: LeaveBalanceService, queue). commandBus/redis/queue below are placeholders
  // reused from other handlers' fakes, not actual routing/auth/balance fakes — confirm
  // FakeCommandBus/FakeRedisService/FakeQueue implement those interfaces, or swap in
  // dedicated fakes once available.
  const hrApprove = new HrApproveLeaveRequestHandler(
    prisma as any,
    commandBus as any,
    redis as any,
    queue as any,
    queue as any,
  );

  // TODO: same constructor-slot mismatch as hrApprove above —
  // RejectLeaveRequestHandler expects (prisma, routing, auth, balance, queue).
  const reject = new RejectLeaveRequestHandler(
    prisma as any,
    commandBus as any,
    redis as any,
    queue as any,
    queue as any,
  );

  return {
    prisma,
    redis,
    queue,
    commandBus,
    conflictDetection,

    submit,
    teamLeadComment,
    deptApprove,
    hrApprove,
    reject,
  };
}

/**
 * Represents the standard organization fixture used by the tests.
 */
export interface Org {
  tenant: any;

  engineering: {
    id: string;
  };

  hrDept: {
    id: string;
  };

  policy: any;

  employee: any;
  teamLead: any;
  deptHead: any;
  hrAdmin: any;
  tenantAdmin: any;
}

/**
 * Creates a standard tenant/department/role fixture.
 *
 * Organization structure:
 *
 * Tenant
 * ├── Engineering
 * │   ├── Employee
 * │   ├── Team Lead
 * │   └── Department Head
 * │
 * ├── HR
 * │   └── HR Admin
 * │
 * └── Tenant Admin
 */
export function seedOrg(prisma: FakePrismaService): Org {
  const tenant = seedTenant(prisma);

  const engineering = {
    id: 'dept_engineering',
  };

  const hrDept = {
    id: 'dept_hr',
  };

  tenant.hrDepartmentId = hrDept.id;

  const policy = seedLeavePolicy(prisma, {
    tenantId: tenant.id,
    accrualRate: 21,
    maxBalance: 21,
  });

  const employee = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'EMPLOYEE',
    departmentId: engineering.id,
  });

  const teamLead = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'TEAM_LEAD',
    departmentId: engineering.id,
  });

  const deptHead = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'DEPT_HEAD',
    departmentId: engineering.id,
  });

  const hrAdmin = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'HR_ADMIN',
    departmentId: hrDept.id,
  });

  const tenantAdmin = seedUser(prisma, {
    tenantId: tenant.id,
    role: 'TENANT_ADMIN',
    departmentId: null,
  });

  const users = [employee, teamLead, deptHead, hrAdmin, tenantAdmin];

  for (const user of users) {
    seedAvailableBalance(prisma, {
      tenantId: tenant.id,
      employeeId: user.id,
      leavePolicyId: policy.id,
      amount: 21,
    });
  }

  return {
    tenant,
    engineering,
    hrDept,
    policy,
    employee,
    teamLead,
    deptHead,
    hrAdmin,
    tenantAdmin,
  };
}

/**
 * Submits a standard leave request using the supplied user.
 *
 * The request uses the standard test dates defined in TEST_LEAVE_DATES.
 */
export async function submitAs(w: Wiring, user: any, org: Org) {
  const result = await w.submit.execute({
    submitLeaveRequestDto: {
      leavePolicyId: org.policy.id,
      departmentId: org.engineering.id,
      startDate: TEST_LEAVE_DATES.startDate,
      endDate: TEST_LEAVE_DATES.endDate,
      isHalfDay: false,
      reason: 'Personal',
    },

    tenantId: org.tenant.id,
    userId: user.id,
  } as any);

  return result.leaveRequest;
}

/**
 * Finds a leave request by its ID.
 *
 * Returns undefined when the request does not exist.
 */
export function getRequest(w: Wiring, leaveRequestId: string) {
  return w.prisma.leaveRequests.find(
    (request) => request.id === leaveRequestId,
  );
}
