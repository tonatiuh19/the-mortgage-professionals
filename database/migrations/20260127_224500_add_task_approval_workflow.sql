-- Migration: Add task approval workflow
-- Date: 2026-01-27 22:45:00
-- Description: Add fields to support broker/admin approval of completed tasks and reopening for rework

-- Modify tasks table to add new status values and approval fields
ALTER TABLE `tasks` 
MODIFY COLUMN `status` ENUM(
  'pending',
  'in_progress', 
  'completed',
  'pending_approval',
  'approved',
  'reopened',
  'cancelled',
  'overdue'
) NOT NULL DEFAULT 'pending';

-- Add approval tracking fields
ALTER TABLE `tasks`
ADD COLUMN `approval_status` ENUM('pending', 'approved', 'rejected') DEFAULT NULL COMMENT 'Approval status by broker/admin',
ADD COLUMN `approved_by_broker_id` INT(11) DEFAULT NULL COMMENT 'Broker who approved the task',
ADD COLUMN `approved_at` DATETIME DEFAULT NULL COMMENT 'When task was approved',
ADD COLUMN `reopened_by_broker_id` INT(11) DEFAULT NULL COMMENT 'Broker who reopened the task',
ADD COLUMN `reopened_at` DATETIME DEFAULT NULL COMMENT 'When task was reopened',
ADD COLUMN `reopen_reason` TEXT DEFAULT NULL COMMENT 'Reason for reopening task';

-- Add foreign key constraints
ALTER TABLE `tasks`
ADD CONSTRAINT `fk_tasks_approved_by` FOREIGN KEY (`approved_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_tasks_reopened_by` FOREIGN KEY (`reopened_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL;
