/*
  Warnings:

  - You are about to drop the column `slug` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `workEmail` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `tenants_slug_key` ON `tenants`;

-- AlterTable
ALTER TABLE `tenants` DROP COLUMN `slug`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `workEmail`;

-- CreateIndex
CREATE UNIQUE INDEX `tenants_name_key` ON `tenants`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);
