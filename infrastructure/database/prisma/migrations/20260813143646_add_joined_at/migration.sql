/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `onboardedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `tenant_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenant_integrations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `tenant_configs` DROP FOREIGN KEY `tenant_configs_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `tenant_integrations` DROP FOREIGN KEY `tenant_integrations_tenantId_fkey`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `deletedAt`,
    DROP COLUMN `onboardedAt`,
    ADD COLUMN `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- DropTable
DROP TABLE `tenant_configs`;

-- DropTable
DROP TABLE `tenant_integrations`;
