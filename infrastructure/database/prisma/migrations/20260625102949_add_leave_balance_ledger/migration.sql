-- DropForeignKey
ALTER TABLE `departments` DROP FOREIGN KEY `departments_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_policies` DROP FOREIGN KEY `leave_policies_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_policy_departments` DROP FOREIGN KEY `leave_policy_departments_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_policy_departments` DROP FOREIGN KEY `leave_policy_departments_leavePolicyId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_request_comments` DROP FOREIGN KEY `leave_request_comments_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_request_comments` DROP FOREIGN KEY `leave_request_comments_leaveRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_requests` DROP FOREIGN KEY `leave_requests_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_requests` DROP FOREIGN KEY `leave_requests_leavePolicyId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_requests` DROP FOREIGN KEY `leave_requests_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_requests` DROP FOREIGN KEY `leave_requests_userId_fkey`;

-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_userId_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_tenantId_fkey`;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sourceType` ENUM('LEAVE_REQUEST', 'LEAVE_BALANCE', 'SYSTEM') NOT NULL,
    `sourceId` VARCHAR(191) NULL,

    INDEX `notifications_tenantId_userId_isRead_idx`(`tenantId`, `userId`, `isRead`),
    INDEX `notifications_tenantId_userId_createdAt_idx`(`tenantId`, `userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_balance_ledger` (
    `id` VARCHAR(191) NOT NULL,
    `entryType` ENUM('ACCRUAL', 'ADJUSTMENT', 'DEDUCTION', 'CARRY_OVER', 'EXPIRY', 'REINSTATEMENT') NOT NULL,
    `amount` DECIMAL(5, 2) NOT NULL,
    `isPending` BOOLEAN NOT NULL DEFAULT false,
    `effectiveDate` DATE NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tenantId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `leavePolicyId` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,

    INDEX `leave_balance_ledger_tenantId_employeeId_leavePolicyId_effec_idx`(`tenantId`, `employeeId`, `leavePolicyId`, `effectiveDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_policies` ADD CONSTRAINT `leave_policies_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_policy_departments` ADD CONSTRAINT `leave_policy_departments_leavePolicyId_fkey` FOREIGN KEY (`leavePolicyId`) REFERENCES `leave_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_policy_departments` ADD CONSTRAINT `leave_policy_departments_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_leavePolicyId_fkey` FOREIGN KEY (`leavePolicyId`) REFERENCES `leave_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_request_comments` ADD CONSTRAINT `leave_request_comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_request_comments` ADD CONSTRAINT `leave_request_comments_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balance_ledger` ADD CONSTRAINT `leave_balance_ledger_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balance_ledger` ADD CONSTRAINT `leave_balance_ledger_leavePolicyId_fkey` FOREIGN KEY (`leavePolicyId`) REFERENCES `leave_policies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balance_ledger` ADD CONSTRAINT `leave_balance_ledger_referenceId_fkey` FOREIGN KEY (`referenceId`) REFERENCES `leave_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
