-- Migration: Add document count requirements to task templates
-- Date: January 21, 2026
-- Description: Adds min/max document count fields to specify how many files are required

ALTER TABLE `task_templates`
  ADD COLUMN `min_documents` int(11) DEFAULT 1 COMMENT 'Minimum number of documents required (NULL = no minimum)',
  ADD COLUMN `max_documents` int(11) DEFAULT NULL COMMENT 'Maximum number of documents allowed (NULL = unlimited)';

-- Add index for querying
CREATE INDEX `idx_task_templates_min_documents` ON `task_templates` (`min_documents`);

-- Add constraint to ensure min <= max when both are set
-- Note: This will be validated in application code as MySQL doesn't support CHECK constraints well in older versions
