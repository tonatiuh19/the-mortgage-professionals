-- Broker email alert preferences (Profile → Notification Preferences).
-- In-app bell is always on; these flags only gate email alerts.
-- Missing row = app defaults (all ON except inbound_email OFF).

CREATE TABLE IF NOT EXISTS `broker_notification_preferences` (
  `broker_id` int NOT NULL,
  `tenant_id` int NOT NULL DEFAULT 2,
  `email_new_application` tinyint(1) NOT NULL DEFAULT 1,
  `email_voicemail` tinyint(1) NOT NULL DEFAULT 1,
  `email_inbound_sms` tinyint(1) NOT NULL DEFAULT 1,
  `email_inbound_email` tinyint(1) NOT NULL DEFAULT 0,
  `email_scheduler_booking` tinyint(1) NOT NULL DEFAULT 1,
  `email_reminder_flow_broker` tinyint(1) NOT NULL DEFAULT 1,
  `secondary_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`broker_id`),
  KEY `idx_bnp_tenant` (`tenant_id`),
  CONSTRAINT `fk_bnp_broker` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bnp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
