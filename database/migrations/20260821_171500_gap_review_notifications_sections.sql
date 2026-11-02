-- Gap-review follow-ups: notifications shape + admin section seeds
-- Idempotent for TiDB / MySQL 8

ALTER TABLE `notifications`
  ADD COLUMN IF NOT EXISTS `recipient_type` enum('client','broker') NOT NULL DEFAULT 'client' AFTER `user_id`,
  ADD COLUMN IF NOT EXISTS `category` varchar(32) NOT NULL DEFAULT 'system' AFTER `notification_type`;

-- Drop legacy FK to clients(id) if present (broker notifications store broker ids in user_id)
SET @fk := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'clients'
  LIMIT 1
);
SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE notifications DROP FOREIGN KEY `', @fk, '`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO admin_section_controls (tenant_id, section_id, is_disabled, tooltip_message)
SELECT 2, v.section_id, 0, 'Coming Soon'
FROM (
  SELECT CAST('crm-people' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS section_id UNION ALL
  SELECT CAST('broadcasts' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
  SELECT CAST('compliance' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
  SELECT CAST('notifications' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
  SELECT CAST('calendar' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
  SELECT CAST('scheduler' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
  SELECT CAST('contact-submissions' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci UNION ALL
  SELECT CAST('income-calculator' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
) v
WHERE NOT EXISTS (
  SELECT 1 FROM admin_section_controls a
  WHERE a.tenant_id = 2 AND a.section_id = v.section_id
);

ALTER TABLE conversation_threads
  MODIFY COLUMN broker_id int(11) NULL DEFAULT NULL;
