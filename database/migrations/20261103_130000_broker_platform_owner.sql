-- Platform owners control billing; other admins keep their admin access.
ALTER TABLE brokers
  ADD COLUMN is_platform_owner TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

UPDATE brokers
SET is_platform_owner = 1
WHERE tenant_id = 2 AND id IN (6, 7, 180002);
