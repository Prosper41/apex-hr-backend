/*
  Warnings:

  - A unique constraint covering the columns `[passwordResetToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,tenantId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `companyLocation` VARCHAR(191) NULL,
    ADD COLUMN `companyPhone` VARCHAR(191) NULL,
    ADD COLUMN `companyType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `passwordResetToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_passwordResetToken_key` ON `users`(`passwordResetToken`);

-- CreateIndex
CREATE UNIQUE INDEX `users_email_tenantId_key` ON `users`(`email`, `tenantId`);
