-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `deptComment` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `offboardedAt` DATETIME(3) NULL,
    ADD COLUMN `onboardedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
