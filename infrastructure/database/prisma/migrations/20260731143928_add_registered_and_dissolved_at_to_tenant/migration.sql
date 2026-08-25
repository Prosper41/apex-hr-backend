-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `dissolvedAt` DATETIME(3) NULL,
    ADD COLUMN `registeredAt` DATETIME(3) NULL;

-- Backfill existing rows using createdAt as a reasonable default
UPDATE `tenants` SET `registeredAt` = `createdAt` WHERE `registeredAt` IS NULL;

-- Now enforce NOT NULL
ALTER TABLE `tenants` MODIFY COLUMN `registeredAt` DATETIME(3) NOT NULL;