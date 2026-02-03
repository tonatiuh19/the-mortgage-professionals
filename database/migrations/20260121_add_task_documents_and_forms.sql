-- Migration: Add task documents and custom forms support
-- Date: January 21, 2026
-- Description: Enhances tasks to support document requirements and custom form fields

-- Table for task template custom form fields
CREATE TABLE IF NOT EXISTS `task_form_fields` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_template_id` int(11) NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Field name (e.g., license_number)',
  `field_label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display label',
  `field_type` enum('text','number','email','phone','date','textarea','file_pdf','file_image','select','checkbox') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `field_options` json DEFAULT NULL COMMENT 'Options for select fields',
  `is_required` tinyint(1) DEFAULT 1,
  `placeholder` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_rules` json DEFAULT NULL COMMENT 'Validation rules (min, max, pattern, etc)',
  `order_index` int(11) DEFAULT 0,
  `help_text` text COLLATE utf8mb4_unicode_ci COMMENT 'Helper text shown below field',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_template_id` (`task_template_id`),
  KEY `idx_order_index` (`order_index`),
  CONSTRAINT `fk_task_form_fields_template` FOREIGN KEY (`task_template_id`) REFERENCES `task_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom form fields for task templates';

-- Table for task form field responses (submitted by clients/brokers)
CREATE TABLE IF NOT EXISTS `task_form_responses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `field_value` text COLLATE utf8mb4_unicode_ci COMMENT 'Text value for non-file fields',
  `submitted_by_user_id` int(11) DEFAULT NULL,
  `submitted_by_broker_id` int(11) DEFAULT NULL,
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_task_field_response` (`task_id`,`field_id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_field_id` (`field_id`),
  CONSTRAINT `fk_task_form_responses_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_form_responses_field` FOREIGN KEY (`field_id`) REFERENCES `task_form_fields` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Submitted responses for task form fields';

-- Table for task document attachments (for file uploads)
CREATE TABLE IF NOT EXISTS `task_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `field_id` int(11) DEFAULT NULL COMMENT 'Associated form field if uploaded via form',
  `document_type` enum('pdf','image') COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Path on external server',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'File size in bytes',
  `uploaded_by_user_id` int(11) DEFAULT NULL,
  `uploaded_by_broker_id` int(11) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_field_id` (`field_id`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  CONSTRAINT `fk_task_documents_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_documents_field` FOREIGN KEY (`field_id`) REFERENCES `task_form_fields` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Document attachments for tasks';

-- Add columns to task_templates for document requirements
ALTER TABLE `task_templates`
  ADD COLUMN `requires_documents` tinyint(1) DEFAULT 0 COMMENT 'Whether this task requires document uploads',
  ADD COLUMN `document_instructions` text COLLATE utf8mb4_unicode_ci COMMENT 'Instructions for required documents',
  ADD COLUMN `has_custom_form` tinyint(1) DEFAULT 0 COMMENT 'Whether this task has custom form fields';

-- Add columns to tasks for tracking form completion
ALTER TABLE `tasks`
  ADD COLUMN `form_completed` tinyint(1) DEFAULT 0 COMMENT 'Whether custom form is completed',
  ADD COLUMN `form_completed_at` datetime DEFAULT NULL COMMENT 'When form was completed',
  ADD COLUMN `documents_uploaded` tinyint(1) DEFAULT 0 COMMENT 'Whether required documents are uploaded',
  ADD COLUMN `documents_verified` tinyint(1) DEFAULT 0 COMMENT 'Whether uploaded documents are verified by broker';

-- Create indexes for performance
CREATE INDEX `idx_task_templates_requires_documents` ON `task_templates` (`requires_documents`);
CREATE INDEX `idx_task_templates_has_custom_form` ON `task_templates` (`has_custom_form`);
CREATE INDEX `idx_tasks_form_completed` ON `tasks` (`form_completed`);
CREATE INDEX `idx_tasks_documents_uploaded` ON `tasks` (`documents_uploaded`);
