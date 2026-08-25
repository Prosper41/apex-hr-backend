-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `tenantAdminApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `tenantAdminApproverId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_tenantAdminApproverId_fkey` FOREIGN KEY (`tenantAdminApproverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
