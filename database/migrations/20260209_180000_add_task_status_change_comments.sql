-- Migration: Add task status change comments and audit tracking
-- Date: 2026-02-09 18:00:00
-- Description: Add fields to track comments when manually changing task status for audit purposes

-- Add status_change_reason to tasks table for tracking manual status changes
ALTER TABLE `tasks` 
ADD COLUMN `status_change_reason` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Reason/comment for manual status changes' AFTER `reopen_reason`,
ADD COLUMN `status_changed_by_broker_id` int(11) DEFAULT NULL COMMENT 'Broker who manually changed status' AFTER `status_change_reason`,
ADD COLUMN `status_changed_at` datetime DEFAULT NULL COMMENT 'When status was manually changed' AFTER `status_changed_by_broker_id`;

-- Add foreign key constraint for status_changed_by_broker_id
ALTER TABLE `tasks` 
ADD CONSTRAINT `fk_tasks_status_changed_by_broker` 
FOREIGN KEY (`status_changed_by_broker_id`) REFERENCES `brokers`(`id`) ON DELETE SET NULL;

-- Create index for better query performance on audit queries
CREATE INDEX `idx_tasks_status_changes` ON `tasks` (`status_changed_at`, `status_changed_by_broker_id`);
CREATE INDEX `idx_tasks_audit_tracking` ON `tasks` (`status`, `status_changed_at`, `application_id`);