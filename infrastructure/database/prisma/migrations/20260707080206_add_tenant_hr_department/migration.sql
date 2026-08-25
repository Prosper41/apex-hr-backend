/*
  Warnings:

  - A unique constraint covering the columns `[hrDepartmentId]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `hrDepartmentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `tenants_hrDepartmentId_key` ON `tenants`(`hrDepartmentId`);

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_hrDepartmentId_fkey` FOREIGN KEY (`hrDepartmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
