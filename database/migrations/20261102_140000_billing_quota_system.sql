-- Billing and quota system for this tenant. Composed from real-state billing migrations, seeded for tenant 2.
-- billing_quota_mode stays off, so nothing is restricted until enforcement is turned on deliberately.
-- Unified billing & quota system (default: off — no metering, no blocks)
-- @see docs/BILLING_AND_QUOTA_PLAN.md

CREATE TABLE IF NOT EXISTS tenant_subscription (
  tenant_id INT NOT NULL,
  plan_code VARCHAR(50) NOT NULL DEFAULT 'platform_standard',
  status ENUM('active','trialing','past_due','canceled','inactive') NOT NULL DEFAULT 'active',
  platform_fee_usd DECIMAL(10,2) NOT NULL DEFAULT 350.00,
  period_start DATE NOT NULL,
  period_end DATE NULL,
  included_sms_segments INT NOT NULL DEFAULT 1000,
  included_voice_minutes INT NOT NULL DEFAULT 1500,
  included_email_sends INT NOT NULL DEFAULT 5000,
  included_scheduler_bookings INT NOT NULL DEFAULT 100,
  included_mortgi_ai_tokens BIGINT NOT NULL DEFAULT 500000,
  overage_enabled TINYINT(1) NOT NULL DEFAULT 0,
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id),
  CONSTRAINT fk_tenant_subscription_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_usage_period (
  tenant_id INT NOT NULL,
  period_start DATE NOT NULL,
  dimension ENUM('sms_segments','voice_minutes','email_sends','scheduler_bookings','mortgi_ai_tokens') NOT NULL,
  included_units BIGINT NOT NULL DEFAULT 0,
  used_units BIGINT NOT NULL DEFAULT 0,
  reserved_units BIGINT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, period_start, dimension),
  CONSTRAINT fk_tenant_usage_period_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_usage_ledger (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  dimension ENUM('sms_segments','voice_minutes','email_sends','scheduler_bookings','mortgi_ai_tokens') NOT NULL,
  units DECIMAL(14,4) NOT NULL,
  source VARCHAR(50) NOT NULL,
  ref_type VARCHAR(50) NULL,
  ref_id VARCHAR(100) NULL,
  action ENUM('grant','consume','reserve','capture','release','top_up') NOT NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tul_tenant_created (tenant_id, created_at),
  KEY idx_tul_tenant_dimension (tenant_id, dimension),
  CONSTRAINT fk_tenant_usage_ledger_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_usage_reservations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  broadcast_id INT NULL,
  units_json JSON NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('pending','captured','released','expired') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tur_tenant_status (tenant_id, status),
  KEY idx_tur_tenant_broadcast (tenant_id, broadcast_id),
  CONSTRAINT fk_tenant_usage_reservations_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tenant_usage_reservations_broadcast
    FOREIGN KEY (broadcast_id) REFERENCES realtor_broadcasts(id) ON DELETE SET NULL
);

-- Feature flags (safe defaults: off / hidden)
INSERT INTO system_settings (tenant_id, setting_key, setting_value, setting_type, description)
VALUES
  (2, 'billing_quota_mode', 'off', 'string', 'off|shadow|warn|enforce — quota enforcement mode'),
  (2, 'billing_ui_enabled', 'false', 'boolean', 'Show /admin/billing for platform_owner'),
  (2, 'billing_overage_enabled', 'false', 'boolean', 'Allow usage beyond included quota when in enforce mode'),
  (2, 'billing_enforce_broadcast_daily', 'true', 'boolean', 'Keep broadcast_daily_* caps even in enforce mode')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  setting_type = VALUES(setting_type),
  description = VALUES(description),
  updated_at = NOW();

-- Seed subscription row for tenant 1 (calendar month period)
INSERT INTO tenant_subscription (
  tenant_id,
  plan_code,
  status,
  platform_fee_usd,
  period_start,
  period_end,
  included_sms_segments,
  included_voice_minutes,
  included_email_sends,
  included_scheduler_bookings,
  included_mortgi_ai_tokens,
  overage_enabled
)
VALUES (
  2,
  'platform_standard',
  'active',
  350.00,
  DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01'),
  LAST_DAY(UTC_TIMESTAMP()),
  1000,
  1500,
  5000,
  100,
  500000,
  0
)
ON DUPLICATE KEY UPDATE
  plan_code = VALUES(plan_code),
  status = VALUES(status),
  platform_fee_usd = VALUES(platform_fee_usd),
  period_start = VALUES(period_start),
  period_end = VALUES(period_end),
  included_sms_segments = VALUES(included_sms_segments),
  included_voice_minutes = VALUES(included_voice_minutes),
  included_email_sends = VALUES(included_email_sends),
  included_scheduler_bookings = VALUES(included_scheduler_bookings),
  included_mortgi_ai_tokens = VALUES(included_mortgi_ai_tokens),
  updated_at = NOW();
-- Idempotency key for tenant_usage_ledger (Stripe top-up webhook + confirm race safety).
-- NULL keys are allowed; only top-up rows set a key.

ALTER TABLE tenant_usage_ledger
  ADD COLUMN idempotency_key VARCHAR(150) DEFAULT NULL AFTER metadata_json;

CREATE UNIQUE INDEX uk_tul_idempotency ON tenant_usage_ledger (tenant_id, idempotency_key);
-- Billing access ladder: grace → restricted → suspended (subscription past_due)
-- @see docs/BILLING_AND_QUOTA_PLAN.md D8c

ALTER TABLE tenant_subscription
  ADD COLUMN past_due_at DATETIME NULL COMMENT 'When platform fee payment first failed',
  ADD COLUMN grace_ends_at DATETIME NULL COMMENT 'End of subscription grace window',
  ADD COLUMN restricted_at DATETIME NULL COMMENT 'When cost actions were restricted post-grace',
  ADD COLUMN suspended_at DATETIME NULL COMMENT 'When full billing wall applies';

INSERT INTO system_settings (tenant_id, setting_key, setting_value, setting_type, description)
VALUES
  (2, 'billing_grace_days', '2', 'number', 'Days after past_due before restricting cost actions'),
  (2, 'billing_suspend_days', '7', 'number', 'Days after past_due before suspending tenant (full wall)')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  setting_type = VALUES(setting_type),
  description = VALUES(description),
  updated_at = NOW();
-- Stripe webhook event.id deduplication (Stripe retries up to ~3 days).

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id    VARCHAR(255) NOT NULL,
  event_type  VARCHAR(100) NOT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  KEY idx_swe_processed (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Billing goes live in UI for this tenant; quota enforcement remains off.
UPDATE system_settings SET setting_value = 'true', updated_at = NOW()
WHERE tenant_id = 2 AND setting_key = 'billing_ui_enabled';
