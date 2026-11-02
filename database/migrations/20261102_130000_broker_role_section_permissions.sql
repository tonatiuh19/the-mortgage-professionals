-- Per-role sidebar visibility. Rows override the built-in defaults; admins always
-- see every section. Unlike real-state, roles are all of this tenant's non-admin roles.
CREATE TABLE IF NOT EXISTS broker_role_section_permissions (
  id          INT          NOT NULL AUTO_INCREMENT,
  tenant_id   INT          NOT NULL,
  broker_role VARCHAR(32)  NOT NULL,
  section_id  VARCHAR(100) NOT NULL,
  is_visible  TINYINT(1)   NOT NULL DEFAULT 1,
  updated_by  INT          NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_section (tenant_id, broker_role, section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
