-- Public "Our Team" listing: per-person approval by a platform owner and
-- per-role eligibility controlled by the platform owner.

ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS public_profile_status ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none'
    COMMENT 'Website listing approval: none → pending (requested) → approved | rejected',
  ADD COLUMN IF NOT EXISTS public_profile_requested_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS public_profile_reviewed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS public_profile_reviewed_by INT NULL COMMENT 'brokers.id of the platform owner who reviewed',
  ADD COLUMN IF NOT EXISTS public_profile_rejection_reason VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS public_title VARCHAR(120) NULL COMMENT 'Optional public job title, e.g. Branch Manager / Sr. Mortgage Advisor',
  ADD COLUMN IF NOT EXISTS public_display_order INT NOT NULL DEFAULT 100 COMMENT 'Lower shows first on the Our Team page';

CREATE INDEX idx_brokers_public_profile ON brokers (tenant_id, public_profile_status);

CREATE TABLE IF NOT EXISTS broker_role_public_listing (
  id          INT         NOT NULL AUTO_INCREMENT,
  tenant_id   INT         NOT NULL,
  broker_role VARCHAR(32) NOT NULL,
  is_allowed  TINYINT(1)  NOT NULL DEFAULT 0,
  updated_by  INT         NULL,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_public_listing (tenant_id, broker_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform-owner switch: which roles may appear on the public Our Team page';

-- Defaults: licensed, customer-facing roles on; everyone else off.
INSERT IGNORE INTO broker_role_public_listing (tenant_id, broker_role, is_allowed)
SELECT t.id, r.role, r.allowed
FROM tenants t
CROSS JOIN (
  SELECT 'admin' AS role, 1 AS allowed UNION ALL
  SELECT 'loan_officer', 1 UNION ALL
  SELECT 'loan_processor', 0 UNION ALL
  SELECT 'broker', 0 UNION ALL
  SELECT 'realtor', 0 UNION ALL
  SELECT 'buyers_agent', 0 UNION ALL
  SELECT 'listing_agent', 0
) r;
