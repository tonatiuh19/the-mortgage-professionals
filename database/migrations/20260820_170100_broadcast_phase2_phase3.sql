-- ============================================================
-- Phase 2 & 3: Broadcast saved segments (idempotent)
-- ============================================================

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
