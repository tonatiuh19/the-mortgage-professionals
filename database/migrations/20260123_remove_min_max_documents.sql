-- Migration: Remove min_documents and max_documents from task_templates
-- Date: 2026-01-23
-- Reason: These fields are no longer needed since each document field represents one specific upload

-- Remove columns (will automatically drop associated indexes)
ALTER TABLE `task_templates` 
  DROP COLUMN `min_documents`,
  DROP COLUMN `max_documents`;

-- Note: Each document field now represents one specific upload (e.g., "INE Front", "INE Back")
-- The number of required documents is determined by the number of document fields with is_required=1
