-- AlterTable
ALTER TABLE `users` ADD COLUMN `contact` VARCHAR(191) NULL,
    ADD COLUMN `dateOfBirth` DATETIME(3) NULL,
    ADD COLUMN `houseAddress` VARCHAR(191) NULL,
    ADD COLUMN `workEmail` VARCHAR(191) NULL;
