import { seedOrg, submitAs, wire } from '../test-utils/wiring';

describe('Flow: balance validation at submission', () => {
  it('rejects a request that exceeds the available balance', async () => {
    const w = wire();
    const org = seedOrg(w.prisma);

    // Zero out the employee's seeded balance, leaving nothing available.
    w.prisma.leaveBalanceLedgerEntries =
      w.prisma.leaveBalanceLedgerEntries.filter(
        (e) => e.employeeId !== org.employee.id,
      );

    await expect(submitAs(w, org.employee, org)).rejects.toThrow(
      'Insufficient leave balance',
    );
  });
});
