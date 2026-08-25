-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `deptApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `deptApproverId` VARCHAR(191) NULL,
    ADD COLUMN `hrApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `hrApproverId` VARCHAR(191) NULL,
    ADD COLUMN `teamLeadApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `teamLeadApproverId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'TEAM_LEAD_COMMENTED', 'DEPT_APPROVED', 'REJECTED', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_teamLeadApproverId_fkey` FOREIGN KEY (`teamLeadApproverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_deptApproverId_fkey` FOREIGN KEY (`deptApproverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_hrApproverId_fkey` FOREIGN KEY (`hrApproverId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
