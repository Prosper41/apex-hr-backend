/*
  Warnings:

  - You are about to drop the `leave_types` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `leave_types` DROP FOREIGN KEY `leave_types_tenantId_fkey`;

-- DropTable
DROP TABLE `leave_types`;

-- CreateTable
CREATE TABLE `leave_policies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('Annual', 'Sick', 'Personal', 'Parental', 'Custom') NOT NULL,
    `accrual` ENUM('Monthly', 'Yearly', 'OneTime', 'Manual') NOT NULL,
    `accrualRate` DOUBLE NOT NULL,
    `maxBalance` DOUBLE NOT NULL,
    `carryOverPolicy` ENUM('None', 'Full', 'Limited', 'NA') NOT NULL,
    `carryOverLimit` DOUBLE NULL,
    `waitingPeriodDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_policy_departments` (
    `id` VARCHAR(191) NOT NULL,
    `leavePolicyId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `leave_policy_departments_leavePolicyId_departmentId_key`(`leavePolicyId`, `departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `leave_policies` ADD CONSTRAINT `leave_policies_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_policy_departments` ADD CONSTRAINT `leave_policy_departments_leavePolicyId_fkey` FOREIGN KEY (`leavePolicyId`) REFERENCES `leave_policies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_policy_departments` ADD CONSTRAINT `leave_policy_departments_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
