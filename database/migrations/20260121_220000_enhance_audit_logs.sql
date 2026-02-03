-- Migration: Enhance audit logs table with additional fields
-- Date: 2026-01-21 22:00:00
-- Description: Add status, error_message, and request_id fields for better audit tracking

ALTER TABLE `audit_logs`
ADD COLUMN `status` enum('success','failure','warning') COLLATE utf8mb4_unicode_ci DEFAULT 'success' AFTER `changes`,
ADD COLUMN `error_message` text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `status`,
ADD COLUMN `request_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `error_message`,
ADD COLUMN `duration_ms` int(11) DEFAULT NULL COMMENT 'Request duration in milliseconds' AFTER `request_id`,
ADD INDEX `idx_actor_type` (`actor_type`),
ADD INDEX `idx_action` (`action`),
ADD INDEX `idx_entity_type` (`entity_type`),
ADD INDEX `idx_status` (`status`),
ADD INDEX `idx_request_id` (`request_id`);
