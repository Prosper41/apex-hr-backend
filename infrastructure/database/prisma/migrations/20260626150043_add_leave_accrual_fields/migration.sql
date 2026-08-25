-- DropForeignKey
ALTER TABLE `leave_balance_ledger` DROP FOREIGN KEY `leave_balance_ledger_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_balance_ledger` DROP FOREIGN KEY `leave_balance_ledger_leavePolicyId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_balance_ledger` DROP FOREIGN KEY `leave_balance_ledger_referenceId_fkey`;

-- AddForeignKey
ALTER TABLE `leave_balance_ledger` ADD CONSTRAINT `leave_balance_ledger_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balance_ledger` ADD CONSTRAINT `leave_balance_ledger_leavePolicyId_fkey` FOREIGN KEY (`leavePolicyId`) REFERENCES `leave_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balance_ledger` ADD CONSTRAINT `leave_balance_ledger_referenceId_fkey` FOREIGN KEY (`referenceId`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
