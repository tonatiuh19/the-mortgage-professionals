-- Ensure realtor_prospects exists for broadcast audience targeting

-- ---------- realtor_prospects (used by broadcast audience + prospecting) ----------
CREATE TABLE IF NOT EXISTS `realtor_prospects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT 2,
  `stage` enum('contact_attempted','contacted','appt_set','waiting_for_1st_deal','first_deal_funded','second_deal_funded','top_agent_whale') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'contact_attempted',
  `status` enum('open','won','lost') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `opportunity_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `opportunity_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `contact_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opportunity_source` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_broker_id` int DEFAULT NULL,
  `followers` json DEFAULT NULL,
  `progress_report` enum('ready_to_send','sent') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `add_to_refi_rates_dropped` tinyint(1) NOT NULL DEFAULT '0',
  `created_by_broker_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_realtor_prospects_tenant` (`tenant_id`),
  KEY `idx_realtor_prospects_stage` (`stage`),
  KEY `idx_realtor_prospects_status` (`status`),
  KEY `idx_realtor_prospects_owner` (`owner_broker_id`),
  KEY `idx_realtor_prospects_created_by` (`created_by_broker_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
