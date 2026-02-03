-- Migration: Add task templates support
-- Date: 2026-01-20
-- Description: Restructure tasks to support templates and instances
-- 
-- CURRENT STRUCTURE:
--   - loan_applications: Main loan table with status field tracking loan stages
--   - tasks: Can be standalone (application_id NULL) OR linked to loans (application_id NOT NULL)
-- 
-- NEW STRUCTURE:
--   - task_templates: Reusable task templates (managed in Tasks page)
--   - tasks: Task instances ALWAYS linked to loan_applications (created from templates)
--   - When loan created → Auto-generate task instances from active templates

-- ========================================
-- STEP 1: Create task_templates table
-- ========================================
CREATE TABLE IF NOT EXISTS `task_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `task_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Custom task type from wizard',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `default_due_days` int(11) DEFAULT NULL COMMENT 'Days after loan creation to set as due date (NULL = no due date)',
  `order_index` int(11) DEFAULT 0 COMMENT 'Order in the loan workflow (lower = earlier in process)',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Only active templates are used for new loans',
  `created_by_broker_id` int(11) NOT NULL COMMENT 'Broker who created this template',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created_by_broker` (`created_by_broker_id`),
  KEY `idx_active_order` (`is_active`, `order_index`),
  CONSTRAINT `fk_task_template_broker` FOREIGN KEY (`created_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reusable task templates for loan workflows';

-- STEP 2: Migrate existing standalone tasks to templates
-- ========================================
-- Only migrate if the old lead-based schema still exists
SET @has_lead_col := (
  SELECT COUNT(*)
  FROM information_schema.columns 
  WHERE table_schema = DATABASE()
    AND table_name = 'tasks'
    AND column_name = 'lead_id'
);

SET @migrate_tasks_sql := IF(
  @has_lead_col > 0,
  'INSERT INTO `task_templates` (
     `title`,
     `description`,
     `task_type`,
     `priority`,
     `default_due_days`,
     `order_index`,
     `is_active`,
     `created_by_broker_id`,
     `created_at`,
     `updated_at`
   )
   SELECT 
     t.title,
     t.description,
     t.task_type,
     t.priority,
     CASE 
       WHEN t.due_date IS NOT NULL THEN DATEDIFF(t.due_date, t.created_at)
       ELSE NULL 
     END as default_due_days,
     0 as order_index,
     1 as is_active,
     COALESCE(t.created_by_broker_id, 1) as created_by_broker_id,
     t.created_at,
     t.updated_at
   FROM tasks t
   WHERE t.application_id IS NULL',
  'SELECT "No legacy standalone tasks to migrate" AS msg'
);

PREPARE stmt FROM @migrate_tasks_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- STEP 3: Update tasks table structure
-- ========================================

-- Add template_id and order_index if they don't exist
SET @exist_template_id := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'template_id' AND table_schema = DATABASE());
SET @exist_order_index := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'order_index' AND table_schema = DATABASE());

SET @query_template_id = IF(@exist_template_id = 0,
  'ALTER TABLE `tasks` ADD COLUMN `template_id` int(11) DEFAULT NULL COMMENT ''References task_template if created from template'' AFTER `id`, ADD KEY `idx_template` (`template_id`), ADD CONSTRAINT `fk_task_template` FOREIGN KEY (`template_id`) REFERENCES `task_templates` (`id`) ON DELETE SET NULL',
  'SELECT "Column template_id already exists" AS msg');
PREPARE stmt FROM @query_template_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query_order_index = IF(@exist_order_index = 0,
  'ALTER TABLE `tasks` ADD COLUMN `order_index` int(11) DEFAULT 0 COMMENT ''Order in loan workflow (copied from template)'' AFTER `template_id`',
  'SELECT "Column order_index already exists" AS msg');
PREPARE stmt FROM @query_order_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update task_type to varchar to support custom types (skip if already varchar)
SET @task_type_check := (SELECT DATA_TYPE FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_type' AND table_schema = DATABASE());
SET @query_task_type = IF(@task_type_check != 'varchar',
  'ALTER TABLE `tasks` MODIFY COLUMN `task_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT ''Matches task_template.task_type''',
  'SELECT "task_type already varchar" AS msg');
PREPARE stmt FROM @query_task_type;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove lead_id if it exists
SET @exist_lead_id := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'lead_id' AND table_schema = DATABASE());
SET @query_drop_lead_fk = IF(@exist_lead_id > 0,
  'ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_ibfk_2`',
  'SELECT "Foreign key tasks_ibfk_2 does not exist" AS msg');
PREPARE stmt FROM @query_drop_lead_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query_drop_lead_col = IF(@exist_lead_id > 0,
  'ALTER TABLE `tasks` DROP COLUMN `lead_id`',
  'SELECT "Column lead_id does not exist" AS msg');
PREPARE stmt FROM @query_drop_lead_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Delete orphaned standalone tasks (only if application_id column allows NULL)
DELETE FROM `tasks` WHERE `application_id` IS NULL;

-- NOTE: We intentionally do NOT modify application_id nullability or
-- its existing foreign key here to avoid conflicts with prior
-- migrations. The existing constraint (tasks_ibfk_1) already points
-- to loan_applications with ON DELETE CASCADE.

-- Add index if it doesn't exist
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = 'tasks' AND index_name = 'idx_application_status' AND table_schema = DATABASE());
SET @query_idx = IF(@idx_exists = 0,
  'CREATE INDEX `idx_application_status` ON `tasks` (`application_id`, `status`)',
  'SELECT "Index idx_application_status already exists" AS msg');
PREPARE stmt FROM @query_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- STEP 4: Seed default task templates
-- ========================================
-- Only seed if no templates exist yet
INSERT INTO `task_templates` 
  (`title`, `description`, `task_type`, `priority`, `default_due_days`, `order_index`, `is_active`, `created_by_broker_id`) 
SELECT * FROM (SELECT
  'Initial Document Collection' as title, 'Collect initial loan application documents from client' as description, 'document_collection' as task_type, 'high' as priority, 2 as default_due_days, 1 as order_index, 1 as is_active, 1 as created_by_broker_id
  UNION ALL SELECT 'Credit Report Review', 'Pull and review client credit report', 'credit_check', 'high', 1, 2, 1, 1
  UNION ALL SELECT 'Income Verification', 'Verify employment and income documentation', 'verification', 'high', 3, 3, 1, 1
  UNION ALL SELECT 'Property Appraisal Order', 'Order property appraisal', 'appraisal', 'medium', 5, 4, 1, 1
  UNION ALL SELECT 'Title Search', 'Order title search and insurance', 'title_search', 'medium', 7, 5, 1, 1
  UNION ALL SELECT 'Underwriting Submission', 'Submit complete file to underwriting', 'underwriting', 'high', 10, 6, 1, 1
  UNION ALL SELECT 'Conditional Approval Follow-up', 'Address underwriting conditions', 'follow_up', 'high', 14, 7, 1, 1
  UNION ALL SELECT 'Clear to Close', 'Final review before closing', 'review', 'urgent', 21, 8, 1, 1
  UNION ALL SELECT 'Schedule Closing', 'Coordinate closing date with all parties', 'closing', 'high', 25, 9, 1, 1
  UNION ALL SELECT 'Fund Loan', 'Final loan funding and disbursement', 'closing', 'urgent', 30, 10, 1, 1
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM `task_templates` LIMIT 1);

-- ========================================
-- STEP 5: Remove redundant workflow tables
-- ========================================
-- The old workflow_steps and workflow_templates tables are replaced by task_templates
-- task_templates is more flexible (custom types, individual activation, dynamic ordering)

-- Drop foreign key constraints first
ALTER TABLE `workflow_steps` DROP FOREIGN KEY `workflow_steps_ibfk_1`;

-- Drop the tables
DROP TABLE IF EXISTS `workflow_steps`;
DROP TABLE IF EXISTS `workflow_templates`;

-- ========================================
-- PIPELINE KANBAN BOARD QUERY
-- ========================================
-- For Pipeline page to show loan applications with their current task:
-- 
-- SELECT 
--   la.*,
--   (SELECT CONCAT(t.title, ' (', t.status, ')')
--    FROM tasks t
--    WHERE t.application_id = la.id 
--      AND t.status IN ('pending', 'in_progress')
--    ORDER BY t.order_index ASC, t.due_date ASC
--    LIMIT 1) as next_task,
--   (SELECT COUNT(*)
--    FROM tasks t
--    WHERE t.application_id = la.id 
--      AND t.status = 'completed') as completed_tasks_count,
--   (SELECT COUNT(*)
--    FROM tasks t
--    WHERE t.application_id = la.id) as total_tasks_count
-- FROM loan_applications la
-- ORDER BY la.status, la.priority DESC;

-- ========================================
-- VERIFICATION QUERIES (run these to check migration)
-- ========================================
-- Check templates created:
-- SELECT COUNT(*) as template_count FROM task_templates;
-- 
-- Check tasks are linked to loans:
-- SELECT COUNT(*) as tasks_with_loans FROM tasks WHERE application_id IS NOT NULL;
-- 
-- Check no orphaned tasks:
-- SELECT COUNT(*) as orphaned_tasks FROM tasks WHERE application_id IS NULL;
