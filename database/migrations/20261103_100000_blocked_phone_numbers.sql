-- Blocked phone numbers (tenant-wide).
-- Inbound calls from a blocked number are rejected before any line rings
-- (TwiML <Reject reason="busy"/>); inbound SMS are dropped without creating
-- a conversation, notification or email. STOP/START keywords are still
-- honoured for compliance. Matching uses the last 10 digits.
-- TiDB Cloud Serverless (MySQL 8.0 compatible).

CREATE TABLE IF NOT EXISTS `blocked_phone_numbers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `phone_e164` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Number as entered, normalised to E.164 when possible',
  `normalized_phone` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Last 10 digits; used for matching',
  `block_calls` tinyint(1) NOT NULL DEFAULT '1',
  `block_sms` tinyint(1) NOT NULL DEFAULT '1',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blocked_by_broker_id` int DEFAULT NULL,
  `blocked_call_count` int NOT NULL DEFAULT '0' COMMENT 'Inbound calls rejected since blocking',
  `blocked_sms_count` int NOT NULL DEFAULT '0' COMMENT 'Inbound SMS dropped since blocking',
  `last_blocked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blocked_phone_tenant_norm` (`tenant_id`, `normalized_phone`),
  KEY `idx_blocked_phone_broker` (`blocked_by_broker_id`),
  CONSTRAINT `fk_blocked_phone_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
