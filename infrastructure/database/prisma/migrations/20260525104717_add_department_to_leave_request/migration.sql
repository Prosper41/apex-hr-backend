/*
  Warnings:

  - Added the required column `departmentId` to the `leave_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `departmentId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
