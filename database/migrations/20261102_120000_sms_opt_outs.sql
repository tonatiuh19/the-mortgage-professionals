-- Durable SMS opt-out list keyed by phone, so STOP also covers contacts with no
-- opt-in column (realtor prospects) and survives across broadcasts.
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id              INT NOT NULL AUTO_INCREMENT,
  tenant_id       INT NOT NULL,
  phone_last10    VARCHAR(10) NOT NULL,
  opted_out_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenant_phone (tenant_id, phone_last10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
