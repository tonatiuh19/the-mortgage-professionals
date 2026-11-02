-- Bulk import jobs and calculator saves for this tenant.
-- Bulk CSV import staging jobs (platform owner only)

CREATE TABLE IF NOT EXISTS `bulk_import_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `entity` enum('clients','realtors') COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by_broker_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_sha256` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('validated','committed','expired','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'validated',
  `options_json` json DEFAULT NULL,
  `preview_json` json DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `row_count` int NOT NULL DEFAULT '0',
  `created_count` int NOT NULL DEFAULT '0',
  `skipped_count` int NOT NULL DEFAULT '0',
  `error_count` int NOT NULL DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `committed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bulk_import_tenant_status` (`tenant_id`,`status`),
  KEY `idx_bulk_import_uploader` (`uploaded_by_broker_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Add 'processing' status for atomic commit claim (prevents double-commit)

ALTER TABLE `bulk_import_jobs`
  MODIFY COLUMN `status` enum('validated','processing','committed','expired','failed')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'validated';
-- Broker calculator saves: CRM-linked loan/income worksheet snapshots (server-backed).
-- client_id required; loan_application_id optional.
-- Apply-to-loan appends a formatted snapshot to loan_applications.notes only.

CREATE TABLE IF NOT EXISTS `broker_calculator_saves` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL,
  `broker_id` INT NOT NULL COMMENT 'Creator broker',
  `client_id` INT NOT NULL,
  `loan_application_id` INT DEFAULT NULL,
  `kind` ENUM(
    'fha',
    'va',
    'conventional',
    'investment',
    'mobile_home',
    'income'
  ) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `summary_json` JSON DEFAULT NULL COMMENT 'Grid preview: payment, household_total, etc.',
  `payload_json` JSON NOT NULL COMMENT 'Full worksheet / loan calc inputs',
  `borrower_client_ids` JSON DEFAULT NULL COMMENT 'Wage earner: [id|null x4]',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bcs_tenant_broker` (`tenant_id`, `broker_id`),
  KEY `idx_bcs_tenant_client` (`tenant_id`, `client_id`),
  KEY `idx_bcs_tenant_kind` (`tenant_id`, `kind`),
  KEY `idx_bcs_loan` (`loan_application_id`),
  CONSTRAINT `fk_bcs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bcs_broker` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bcs_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bcs_loan` FOREIGN KEY (`loan_application_id`) REFERENCES `loan_applications` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
