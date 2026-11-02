-- Per-Owner CRM — Phase 1: per-owner phone UNIQUE (flags still OFF — legacy API checks)
-- TMP: application-layer phone conflict checks remain tenant-wide until PER_OWNER_CRM_ENABLED.
--
-- PRECONDITION: No duplicate (tenant_id, assigned_broker_id, normalized_phone) groups.
-- TiDB Cloud Serverless (MySQL 8.0 compatible).

-- Backfill list_visibility for any legacy rows
UPDATE `clients`
SET `list_visibility` = 'active'
WHERE `list_visibility` IS NULL OR `list_visibility` = '';

-- Backfill normalized_phone from phone when missing
UPDATE `clients`
SET `normalized_phone` = RIGHT(REGEXP_REPLACE(`phone`, '[^0-9]', ''), 10)
WHERE `phone` IS NOT NULL
  AND `phone` != ''
  AND (`normalized_phone` IS NULL OR `normalized_phone` = '');

-- Swap unique constraint: tenant-wide (if present) → per-owner
ALTER TABLE `clients` DROP INDEX IF EXISTS `uq_clients_tenant_norm_phone`;

ALTER TABLE `clients`
  ADD UNIQUE KEY `uq_clients_tenant_owner_norm_phone`
    (`tenant_id`, `assigned_broker_id`, `normalized_phone`)
  COMMENT 'Same phone allowed for different owners; one row per owner per phone';
