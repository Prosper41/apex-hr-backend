type Where = Record<string, any>;

/**
 * Mirrors real Prisma where-clause matching, INCLUDING its most surprising
 * behavior: a key set to `undefined` is treated as "no filter on this field",
 * not "match undefined". This is intentional — it's what makes the
 * `departmentId: x ?? undefined` regression test actually reproduce the bug
 * instead of silently passing against a stricter fake.
 */
function matchesWhere(record: any, where: Where): boolean {
  for (const key of Object.keys(where)) {
    const condition = where[key];
    if (condition === undefined) continue;

    if (
      condition &&
      typeof condition === 'object' &&
      !(condition instanceof Date)
    ) {
      if ('in' in condition) {
        if (!condition.in.includes(record[key])) return false;
        continue;
      }
      if ('lte' in condition && !(record[key] <= condition.lte)) return false;
      if ('gte' in condition && !(record[key] >= condition.gte)) return false;
      if ('lt' in condition && !(record[key] < condition.lt)) return false;
      if ('gt' in condition && !(record[key] > condition.gt)) return false;
      if ('equals' in condition && record[key] !== condition.equals)
        return false;
      continue;
    }

    if (record[key] !== condition) return false;
  }
  return true;
}

export class FakePrismaService {
  users: any[] = [];
  leaveRequests: any[] = [];
  leaveRequestComments: any[] = [];
  leaveBalanceLedgerEntries: any[] = [];
  leavePolicies: any[] = [];
  tenants: any[] = [];

  private idCounters: Record<string, number> = {};
  private nextId(prefix: string): string {
    this.idCounters[prefix] = (this.idCounters[prefix] ?? 0) + 1;
    return `${prefix}_${this.idCounters[prefix]}`;
  }

  user = {
    findFirst: ({ where }: { where: Where }) =>
      Promise.resolve(this.users.find((u) => matchesWhere(u, where)) ?? null),
    findUnique: ({ where, select }: { where: Where; select?: any }) => {
      const found = this.users.find((u) => u.id === where.id) ?? null;
      if (!found || !select) return Promise.resolve(found);
      const picked: any = {};
      for (const key of Object.keys(select)) picked[key] = found[key];
      return Promise.resolve(picked);
    },
  };

  leavePolicy = {
    findFirst: ({ where }: { where: Where }) =>
      Promise.resolve(
        this.leavePolicies.find((p) => matchesWhere(p, where)) ?? null,
      ),
  };

  tenant = {
    findUnique: ({ where }: { where: Where }) =>
      Promise.resolve(this.tenants.find((t) => t.id === where.id) ?? null),
  };

  leaveRequest = {
    findFirst: ({ where }: { where: Where }) =>
      Promise.resolve(
        this.leaveRequests.find((r) => matchesWhere(r, where)) ?? null,
      ),
    create: ({ data }: { data: any }) => {
      const record = {
        id: this.nextId('lr'),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamLeadApproverId: null,
        teamLeadApprovedAt: null,
        deptApproverId: null,
        deptApprovedAt: null,
        hrApproverId: null,
        hrApprovedAt: null,
        ...data,
      };
      this.leaveRequests.push(record);
      return Promise.resolve(record);
    },
    update: ({ where, data }: { where: Where; data: any }) => {
      const idx = this.leaveRequests.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error('FakePrisma: leaveRequest not found');
      this.leaveRequests[idx] = {
        ...this.leaveRequests[idx],
        ...data,
        updatedAt: new Date(),
      };
      return Promise.resolve(this.leaveRequests[idx]);
    },
  };

  leaveRequestComment = {
    create: ({ data }: { data: any }) => {
      const record = {
        id: this.nextId('cmt'),
        createdAt: new Date(),
        ...data,
      };
      this.leaveRequestComments.push(record);
      return Promise.resolve(record);
    },
  };

  leaveBalanceLedger = {
    aggregate: ({ where }: { where: Where }) => {
      const matches = this.leaveBalanceLedgerEntries.filter((e) =>
        matchesWhere(e, where),
      );
      if (matches.length === 0) {
        return Promise.resolve({ _sum: { amount: null } });
      }
      const sum = matches.reduce((acc, e) => acc + Number(e.amount), 0);
      return Promise.resolve({
        _sum: { amount: { toNumber: () => sum } },
      });
    },
    create: ({ data }: { data: any }) => {
      const record = {
        id: this.nextId('ledger'),
        createdAt: new Date(),
        ...data,
        amount: Number(data.amount),
      };
      this.leaveBalanceLedgerEntries.push(record);
      return Promise.resolve(record);
    },
  };

  $transaction(arg: any) {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === 'function') return arg(this);
    throw new Error('FakePrisma: unsupported $transaction argument');
  }
}
