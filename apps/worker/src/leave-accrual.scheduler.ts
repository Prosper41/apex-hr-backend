import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@infra/database/prisma/prisma.service';
import { EntryType, AccrualFrequency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LeaveAccrualScheduler {
  private readonly logger = new Logger(LeaveAccrualScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_6_MONTHS)
  async runMonthlyAccruals() {
    this.logger.log('Monthly accrual job started...');

    const policies = await this.prisma.leavePolicy.findMany({
      where: {
        accrual: AccrualFrequency.Monthly,
        isActive: true,
      },
      include: {
        departments: {
          include: {
            department: {
              include: {
                users: true,
              },
            },
          },
        },
      },
    });

    let totalCredits = 0;

    for (const policy of policies) {
      const employees = policy.departments.flatMap(
        (lpd) => lpd.department.users,
      );

      for (const employee of employees) {
        try {
          const rows = await this.prisma.$queryRaw<{ available: string }[]>`
            SELECT
              SUM(CASE WHEN isPending = FALSE THEN amount ELSE 0 END) AS available
            FROM leave_balance_ledger
            WHERE
              tenantId       = ${policy.tenantId}
              AND employeeId     = ${employee.id}
              AND leavePolicyId = ${policy.id}
              AND effectiveDate <= CURDATE()
          `;

          const currentBalance = Number(rows[0]?.available ?? 0);

          if (currentBalance >= policy.maxBalance) {
            this.logger.debug(
              `Skipping ${employee.email} — already at max balance (${currentBalance}/${policy.maxBalance})`,
            );
            continue;
          }

          const creditAmount = Math.min(
            policy.accrualRate,
            policy.maxBalance - currentBalance,
          );

          if (creditAmount <= 0) continue;

          const monthLabel = new Date().toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          });

          await this.prisma.leaveBalanceLedger.create({
            data: {
              tenantId: policy.tenantId,
              employeeId: employee.id,
              leavePolicyId: policy.id,
              entryType: EntryType.ACCRUAL,
              amount: new Decimal(creditAmount),
              isPending: false,
              effectiveDate: new Date(),
              note: `Monthly accrual — ${monthLabel}`,
            },
          });

          totalCredits++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed accrual for employee ${employee.id} on policy ${policy.id}: ${errorMessage}`,
          );
        }
      }
    }

    this.logger.log(
      `Monthly accrual job complete. ${totalCredits} credits inserted.`,
    );
  }

  // Runs on January 1st at midnight — credits all yearly accrual policies
  @Cron('0 0 1 1 *')
  async runYearlyAccruals() {
    this.logger.log('Yearly accrual job started...');

    const policies = await this.prisma.leavePolicy.findMany({
      where: {
        accrual: AccrualFrequency.Yearly,
        isActive: true,
      },
      include: {
        departments: {
          include: {
            department: {
              include: { users: true },
            },
          },
        },
      },
    });

    let totalCredits = 0;

    for (const policy of policies) {
      const employees = policy.departments.flatMap(
        (lpd) => lpd.department.users,
      );

      for (const employee of employees) {
        try {
          const rows = await this.prisma.$queryRaw<{ available: string }[]>`
            SELECT
              SUM(CASE WHEN isPending = FALSE THEN amount ELSE 0 END) AS available
            FROM leave_balance_ledger
            WHERE
              tenantId      = ${policy.tenantId}
              AND employeeId    = ${employee.id}
              AND leavePolicyId = ${policy.id}
              AND effectiveDate <= CURDATE()
          `;

          const currentBalance = Number(rows[0]?.available ?? 0);

          if (currentBalance >= policy.maxBalance) {
            this.logger.debug(
              `Skipping ${employee.email} — already at max balance (${currentBalance}/${policy.maxBalance})`,
            );
            continue;
          }

          const creditAmount = Math.min(
            policy.accrualRate,
            policy.maxBalance - currentBalance,
          );

          if (creditAmount <= 0) continue;

          const year = new Date().getFullYear();

          await this.prisma.leaveBalanceLedger.create({
            data: {
              tenantId: policy.tenantId,
              employeeId: employee.id,
              leavePolicyId: policy.id,
              entryType: EntryType.ACCRUAL,
              amount: new Decimal(creditAmount),
              isPending: false,
              effectiveDate: new Date(),
              note: `Yearly accrual — ${year}`,
            },
          });

          totalCredits++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Failed yearly accrual for employee ${employee.id} on policy ${policy.id}: ${errorMessage}`,
          );
        }
      }
    }

    this.logger.log(
      `Yearly accrual job complete. ${totalCredits} credits inserted.`,
    );
  }

  // Runs on January 1st at 00:05 — 5 minutes after yearly accrual finishes
  @Cron('5 0 1 1 *')
  async runYearEndCarryOver() {
    this.logger.log('Year-end carry-over job started...');

    const policies = await this.prisma.leavePolicy.findMany({
      where: { isActive: true },
      include: {
        departments: {
          include: {
            department: {
              include: { users: true },
            },
          },
        },
      },
    });

    for (const policy of policies) {
      const employees = policy.departments.flatMap(
        (lpd) => lpd.department.users,
      );

      for (const employee of employees) {
        try {
          const rows = await this.prisma.$queryRaw<{ available: string }[]>`
            SELECT SUM(CASE WHEN isPending = FALSE THEN amount ELSE 0 END) AS available
            FROM leave_balance_ledger
            WHERE
              tenantId       = ${policy.tenantId}
              AND employeeId     = ${employee.id}
              AND leavePolicyId = ${policy.id}
              AND effectiveDate <= CURDATE()
          `;

          const unusedDays = Number(rows[0]?.available ?? 0);

          if (unusedDays <= 0) continue;

          const today = new Date();

          if (policy.carryOverPolicy === 'None') {
            await this.prisma.leaveBalanceLedger.create({
              data: {
                tenantId: policy.tenantId,
                employeeId: employee.id,
                leavePolicyId: policy.id,
                entryType: EntryType.EXPIRY,
                amount: new Decimal(-unusedDays),
                isPending: false,
                effectiveDate: today,
                note: 'Year-end expiry — carry-over policy: None',
              },
            });
          } else if (policy.carryOverPolicy === 'Full') {
            await this.prisma.leaveBalanceLedger.create({
              data: {
                tenantId: policy.tenantId,
                employeeId: employee.id,
                leavePolicyId: policy.id,
                entryType: EntryType.CARRY_OVER,
                amount: new Decimal(unusedDays),
                isPending: false,
                effectiveDate: today,
                note: 'Year-end carry-over — policy: Full',
              },
            });
          } else if (policy.carryOverPolicy === 'Limited') {
            const limit = policy.carryOverLimit ?? 0;
            const carryAmount = Math.min(unusedDays, limit);
            const expireAmount = unusedDays - carryAmount;

            if (carryAmount > 0) {
              await this.prisma.leaveBalanceLedger.create({
                data: {
                  tenantId: policy.tenantId,
                  employeeId: employee.id,
                  leavePolicyId: policy.id,
                  entryType: EntryType.CARRY_OVER,
                  amount: new Decimal(carryAmount),
                  isPending: false,
                  effectiveDate: today,
                  note: `Year-end carry-over — ${carryAmount} of ${unusedDays} days carried`,
                },
              });
            }

            if (expireAmount > 0) {
              await this.prisma.leaveBalanceLedger.create({
                data: {
                  tenantId: policy.tenantId,
                  employeeId: employee.id,
                  leavePolicyId: policy.id,
                  entryType: EntryType.EXPIRY,
                  amount: new Decimal(-expireAmount),
                  isPending: false,
                  effectiveDate: today,
                  note: `Year-end expiry — ${expireAmount} days expired (limit: ${limit})`,
                },
              });
            }
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Carry-over failed for employee ${employee.id}: ${errorMessage}`,
          );
        }
      }
    }

    this.logger.log('Year-end carry-over job complete.');
  }

  // ── DEV ONLY — remove before production ──────────────────────────────────
  @Cron(CronExpression.EVERY_30_SECONDS)
  async runDevSeedAccruals() {
    if (process.env.NODE_ENV === 'production') return;

    // this.logger.log('[DEV] Seeding non-monthly accruals...');

    const policies = await this.prisma.leavePolicy.findMany({
      where: {
        accrual: { in: [AccrualFrequency.Yearly, AccrualFrequency.OneTime] },
        isActive: true,
      },
      include: {
        departments: {
          include: {
            department: {
              include: { users: true },
            },
          },
        },
      },
    });

    let totalCredits = 0;

    for (const policy of policies) {
      const employees = policy.departments.flatMap(
        (lpd) => lpd.department.users,
      );

      for (const employee of employees) {
        try {
          const rows = await this.prisma.$queryRaw<{ available: string }[]>`
            SELECT
              SUM(CASE WHEN isPending = FALSE THEN amount ELSE 0 END) AS available
            FROM leave_balance_ledger
            WHERE
              tenantId      = ${policy.tenantId}
              AND employeeId    = ${employee.id}
              AND leavePolicyId = ${policy.id}
              AND effectiveDate <= CURDATE()
          `;

          const currentBalance = Number(rows[0]?.available ?? 0);

          if (currentBalance >= policy.accrualRate) {
            // this.logger.debug(
            //   `[DEV] Skipping ${employee.email} on ${policy.name} — already credited`,
            // );
            continue;
          }

          const creditAmount = Math.min(
            policy.accrualRate,
            policy.maxBalance - currentBalance,
          );

          if (creditAmount <= 0) continue;

          await this.prisma.leaveBalanceLedger.create({
            data: {
              tenantId: policy.tenantId,
              employeeId: employee.id,
              leavePolicyId: policy.id,
              entryType: EntryType.ACCRUAL,
              amount: new Decimal(creditAmount),
              isPending: false,
              effectiveDate: new Date(),
              note: `[DEV] Auto-seeded accrual — ${policy.accrual}`,
            },
          });

          totalCredits++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `[DEV] Failed seed accrual for employee ${employee.id} on policy ${policy.id}: ${errorMessage}`,
          );
        }
      }
    }

    // this.logger.log(
    //   `[DEV] Seed accruals complete. ${totalCredits} credits inserted.`,
    // );
  }
}
