import { FakePrismaService } from './fake-prisma';

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${++counter}`;

export function seedTenant(
  prisma: FakePrismaService,
  overrides: Partial<any> = {},
) {
  const tenant: {
    id: string;
    name: string;
    hrDepartmentId: string | null;
    [key: string]: any;
  } = {
    id: nextId('tenant'),
    name: 'Code Raccoon',
    hrDepartmentId: null,
    ...overrides,
  };
  prisma.tenants.push(tenant);
  return tenant;
}

export function seedUser(
  prisma: FakePrismaService,
  overrides: Partial<any> & { tenantId: string },
) {
  const user = {
    id: nextId('user'),
    role: 'EMPLOYEE',
    departmentId: null,
    firstName: 'Prospergyinka',
    lastName: 'Test',
    email: `prospergyinka+${nextId('email')}@example.com`,
    ...overrides,
  };
  prisma.users.push(user);
  return user;
}

export function seedLeavePolicy(
  prisma: FakePrismaService,
  overrides: Partial<any> & { tenantId: string },
) {
  const policy = {
    id: nextId('policy'),
    name: 'Annual Leave',
    type: 'Annual',
    isActive: true,
    accrualRate: 21,
    maxBalance: 21,
    ...overrides,
  };
  prisma.leavePolicies.push(policy);
  return policy;
}

export function seedAvailableBalance(
  prisma: FakePrismaService,
  args: {
    tenantId: string;
    employeeId: string;
    leavePolicyId: string;
    amount: number;
  },
) {
  prisma.leaveBalanceLedgerEntries.push({
    id: nextId('ledger'),
    tenantId: args.tenantId,
    employeeId: args.employeeId,
    leavePolicyId: args.leavePolicyId,
    entryType: 'ACCRUAL',
    amount: args.amount,
    isPending: false,
    effectiveDate: new Date('2020-01-01'),
  });
}

/** A safe Mon–Wed range (3 weekdays) far enough in the future to avoid weekend drift. */
export const TEST_LEAVE_DATES = {
  startDate: '2027-03-01', // Monday
  endDate: '2027-03-03', // Wednesday
};
