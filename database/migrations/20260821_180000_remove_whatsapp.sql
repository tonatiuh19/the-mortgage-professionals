-- Migration: Remove WhatsApp channel support
-- Date: 2026-08-21
-- TiDB Cloud Serverless / MySQL 8.0 compatible
--
-- 1) Convert or delete existing whatsapp / send_whatsapp rows
-- 2) Drop whatsapp / send_whatsapp from ENUM definitions

-- ── Data cleanup ──────────────────────────────────────────────────────────────

-- Pipeline step assignments: unique (tenant, step, channel) — delete rather than remap
DELETE FROM `pipeline_step_templates`
WHERE `communication_type` = 'whatsapp';

-- Clear campaign FKs that point at WhatsApp templates (ON DELETE SET NULL also covers this)
UPDATE `campaigns` c
INNER JOIN `templates` t ON t.`id` = c.`template_id`
SET c.`template_id` = NULL
WHERE t.`template_type` = 'whatsapp';

-- Remove WhatsApp communication templates
DELETE FROM `templates`
WHERE `template_type` = 'whatsapp';

-- Historical messages / threads → SMS
UPDATE `communications`
SET `communication_type` = 'sms'
WHERE `communication_type` = 'whatsapp';

UPDATE `conversation_threads`
SET `last_message_type` = 'sms'
WHERE `last_message_type` = 'whatsapp';

-- Campaigns typed as whatsapp → sms
UPDATE `campaigns`
SET `campaign_type` = 'sms'
WHERE `campaign_type` = 'whatsapp';

-- Reminder flow steps: send_whatsapp → send_sms
UPDATE `reminder_flow_steps`
SET `step_type` = 'send_sms'
WHERE `step_type` = 'send_whatsapp';

-- ── Enum alterations ──────────────────────────────────────────────────────────

ALTER TABLE `campaigns`
  MODIFY COLUMN `campaign_type` ENUM('email','sms','mixed')
    COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `communications`
  MODIFY COLUMN `communication_type` ENUM('email','sms','call','internal_note')
    COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `conversation_threads`
  MODIFY COLUMN `last_message_type` ENUM('email','sms','call','internal_note')
    COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `pipeline_step_templates`
  MODIFY COLUMN `communication_type` ENUM('email','sms')
    COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `reminder_flow_steps`
  MODIFY COLUMN `step_type` ENUM(
    'trigger',
    'wait',
    'send_notification',
    'send_email',
    'send_sms',
    'condition',
    'branch',
    'wait_for_response',
    'wait_until_date',
    'end'
  ) COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE `templates`
  MODIFY COLUMN `template_type` ENUM('email','sms')
    COLLATE utf8mb4_unicode_ci NOT NULL;
