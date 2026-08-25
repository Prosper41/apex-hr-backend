-- CreateTable
CREATE TABLE `tenant_configs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `companySize` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `dateFormat` VARCHAR(191) NOT NULL DEFAULT 'MM/DD/YYYY',
    `fiscalYearStart` VARCHAR(191) NOT NULL DEFAULT 'January',
    `notificationPreferences` JSON NOT NULL,
    `featureFlags` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_configs_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_integrations` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `provider` ENUM('SENDGRID', 'SLACK', 'SSO_SAML', 'CALENDAR_SYNC') NOT NULL,
    `isConnected` BOOLEAN NOT NULL DEFAULT false,
    `config` JSON NULL,
    `connectedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_integrations_tenantId_provider_key`(`tenantId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tenant_configs` ADD CONSTRAINT `tenant_configs_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_integrations` ADD CONSTRAINT `tenant_integrations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
