-- ============================================================================
-- Migration: Realtor Broadcast Center (TMP)
-- Date: 2026-08-20
-- Description: Broadcast email/SMS tables, opt-in flags, saved segments,
--              and Twilio Bulk Messaging columns. Tenant 2 settings.
-- Compatible: TiDB Cloud Serverless (MySQL 8.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS realtor_broadcasts (
  id              INT NOT NULL AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  created_by      INT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  channel         ENUM('email','sms','both') NOT NULL,
  sms_engine      ENUM('messages','bulk') NOT NULL DEFAULT 'messages',
  twilio_operation_ids JSON DEFAULT NULL,
  bulk_stats_json JSON DEFAULT NULL,
  subject         VARCHAR(500) DEFAULT NULL,
  body_email      LONGTEXT DEFAULT NULL,
  body_sms        TEXT DEFAULT NULL,
  audience_filter JSON NOT NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  sent_count      INT NOT NULL DEFAULT 0,
  failed_count    INT NOT NULL DEFAULT 0,
  status          ENUM('draft','scheduled','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
  is_cancelled    TINYINT(1) NOT NULL DEFAULT 0,
  scheduled_at    DATETIME DEFAULT NULL,
  started_at      DATETIME DEFAULT NULL,
  completed_at    DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tenant_status (tenant_id, status),
  KEY idx_scheduled_at (scheduled_at),
  CONSTRAINT fk_rb_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_rb_broker FOREIGN KEY (created_by) REFERENCES brokers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS realtor_broadcast_recipients (
  id                INT NOT NULL AUTO_INCREMENT,
  broadcast_id      INT NOT NULL,
  tenant_id         INT NOT NULL,
  broker_id         INT DEFAULT NULL,
  prospect_id       INT DEFAULT NULL,
  recipient_name    VARCHAR(255) DEFAULT NULL,
  recipient_email   VARCHAR(255) DEFAULT NULL,
  recipient_phone   VARCHAR(30) DEFAULT NULL,
  email_status      ENUM('pending','processing','sent','failed','bounced','unsubscribed','skipped_no_contact') DEFAULT NULL,
  sms_status        ENUM('pending','processing','sent','failed','undelivered','opted_out','skipped_no_contact') DEFAULT NULL,
  email_ext_id      VARCHAR(255) DEFAULT NULL,
  sms_ext_id        VARCHAR(255) DEFAULT NULL,
  sms_bulk_message_id VARCHAR(128) DEFAULT NULL,
  unsubscribe_token VARCHAR(64) DEFAULT NULL,
  conversation_id   VARCHAR(255) DEFAULT NULL,
  error_message     TEXT DEFAULT NULL,
  sent_at           DATETIME DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_broadcast_id (broadcast_id),
  KEY idx_tenant (tenant_id),
  KEY idx_unsubscribe_token (unsubscribe_token),
  CONSTRAINT fk_rbr_broadcast FOREIGN KEY (broadcast_id) REFERENCES realtor_broadcasts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS realtor_email_unsubscribes (
  id              INT NOT NULL AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  email           VARCHAR(255) NOT NULL,
  unsubscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenant_email (tenant_id, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS broadcast_saved_segments (
  id          INT NOT NULL AUTO_INCREMENT,
  tenant_id   INT NOT NULL,
  created_by  INT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  filter_json JSON NOT NULL COMMENT 'Serialized RealtorBroadcastAudienceFilter',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bss_tenant (tenant_id),
  CONSTRAINT fk_bss_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)  ON DELETE CASCADE,
  CONSTRAINT fk_bss_creator FOREIGN KEY (created_by) REFERENCES brokers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS sms_blast_opted_in TINYINT(1) DEFAULT NULL
    COMMENT 'NULL=unknown, 1=opted in, 0=opted out via STOP reply';

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS sms_blast_opted_in TINYINT(1) DEFAULT NULL
    COMMENT 'NULL=unknown, 1=opted in, 0=opted out via STOP reply';

INSERT INTO system_settings
  (tenant_id, setting_key, setting_value, setting_type, description)
VALUES
  (2, 'broadcast_sms_engine', 'messages', 'string',
   'SMS broadcast delivery engine: messages (default) or bulk (Twilio Bulk Messaging beta)'),
  (2, 'broadcast_bulk_min_recipients', '1', 'number',
   'Minimum SMS recipients before Bulk engine is used when broadcast_sms_engine=bulk'),
  (2, 'broadcast_bulk_chunk_size', '9000', 'number',
   'Max recipients per Twilio Bulk Messages request (hard cap 10000)')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
