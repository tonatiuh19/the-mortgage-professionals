-- Migration: Seed tenant 2 communication templates (email/sms/whatsapp)
-- Date: 2026-05-25 16:00:00
-- Description:
--   Adds baseline communication templates for The Mortgage Professionals
--   so the Communication Templates admin page is not empty after tenant cleanup.

START TRANSACTION;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @target_tenant_id := 2;
SET @creator_broker_id := (
  SELECT b.id
  FROM brokers b
  WHERE b.tenant_id = @target_tenant_id AND b.role = 'admin'
  ORDER BY b.id ASC
  LIMIT 1
);

-- Email templates
INSERT INTO templates (
  tenant_id,
  name,
  description,
  template_type,
  category,
  subject,
  body,
  variables,
  is_active,
  usage_count,
  created_by_broker_id,
  created_at,
  updated_at
)
SELECT
  @target_tenant_id,
  seed.name,
  seed.description,
  'email',
  seed.category,
  seed.subject,
  seed.body,
  seed.variables,
  1,
  0,
  @creator_broker_id,
  NOW(),
  NOW()
FROM (
  SELECT
    'Welcome - Application Received' AS name,
    'Send when a new client submits an application.' AS description,
    'welcome' AS category,
    'We received your mortgage application' AS subject,
    '<p>Hi {{client_name}},</p><p>Thank you for submitting your application with <strong>The Mortgage Professionals</strong>. We have received your information and our team is reviewing it now.</p><p>Need immediate help? Call us at <strong>(562) 337-0000</strong>.</p><p>Best regards,<br/>The Mortgage Professionals Team</p>' AS body,
    JSON_ARRAY('client_name','application_id') AS variables
  UNION ALL SELECT
    'Document Reminder',
    'Request missing or pending documents from client.',
    'reminder',
    'Reminder: documents needed for your mortgage file',
    '<p>Hi {{client_name}},</p><p>This is a friendly reminder that we still need a few items to continue processing your loan.</p><p>Please upload your documents in your client portal or reply to this email if you need assistance.</p><p>Thank you,<br/>The Mortgage Professionals Team</p>',
    JSON_ARRAY('client_name','task_name')
  UNION ALL SELECT
    'Pre-Approval Ready',
    'Notify the client that their pre-approval is ready.',
    'update',
    'Your pre-approval is ready',
    '<p>Hi {{client_name}},</p><p>Great news. Your pre-approval is ready.</p><p>Please log in to your portal to review the details, or contact us if you would like to discuss next steps.</p><p>Best,<br/>The Mortgage Professionals Team</p>',
    JSON_ARRAY('client_name')
  UNION ALL SELECT
    'Meeting Confirmation',
    'Confirm scheduled consultation appointments.',
    'system',
    'Meeting confirmed: {{meeting_date}} at {{meeting_time}}',
    '<p>Hi {{client_name}},</p><p>Your meeting with The Mortgage Professionals has been confirmed for <strong>{{meeting_date}}</strong> at <strong>{{meeting_time}}</strong>.</p><p>If you need to reschedule, reply to this email and we will help right away.</p><p>See you soon,<br/>The Mortgage Professionals Team</p>',
    JSON_ARRAY('client_name','meeting_date','meeting_time')
) AS seed
WHERE @creator_broker_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM templates t
    WHERE t.tenant_id = @target_tenant_id
      AND t.template_type = 'email'
      AND t.name = CONVERT(seed.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
  );

-- SMS templates
INSERT INTO templates (
  tenant_id,
  name,
  description,
  template_type,
  category,
  subject,
  body,
  variables,
  is_active,
  usage_count,
  created_by_broker_id,
  created_at,
  updated_at
)
SELECT
  @target_tenant_id,
  seed.name,
  seed.description,
  'sms',
  seed.category,
  NULL,
  seed.body,
  seed.variables,
  1,
  0,
  @creator_broker_id,
  NOW(),
  NOW()
FROM (
  SELECT
    'Application Received SMS' AS name,
    'Initial confirmation SMS after application submission.' AS description,
    'welcome' AS category,
    'Hi {{client_name}}, we received your mortgage application. Our team at The Mortgage Professionals will contact you shortly.' AS body,
    JSON_ARRAY('client_name') AS variables
  UNION ALL SELECT
    'Document Reminder SMS',
    'Reminder text for pending tasks/documents.',
    'reminder',
    'Hi {{client_name}}, friendly reminder from The Mortgage Professionals: please upload your pending document(s) in the portal so we can keep your file moving.',
    JSON_ARRAY('client_name','task_name')
  UNION ALL SELECT
    'Meeting Reminder SMS',
    'Reminder text before an upcoming meeting.',
    'system',
    'Reminder: your meeting with The Mortgage Professionals is on {{meeting_date}} at {{meeting_time}}. Reply here if you need help.',
    JSON_ARRAY('meeting_date','meeting_time')
) AS seed
WHERE @creator_broker_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM templates t
    WHERE t.tenant_id = @target_tenant_id
      AND t.template_type = 'sms'
      AND t.name = CONVERT(seed.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
  );

-- WhatsApp templates
INSERT INTO templates (
  tenant_id,
  name,
  description,
  template_type,
  category,
  subject,
  body,
  variables,
  is_active,
  usage_count,
  created_by_broker_id,
  created_at,
  updated_at
)
SELECT
  @target_tenant_id,
  seed.name,
  seed.description,
  'whatsapp',
  seed.category,
  NULL,
  seed.body,
  seed.variables,
  1,
  0,
  @creator_broker_id,
  NOW(),
  NOW()
FROM (
  SELECT
    'Document Reminder WhatsApp' AS name,
    'WhatsApp reminder for pending documents.' AS description,
    'reminder' AS category,
    'Hi {{client_name}}. This is The Mortgage Professionals. Please upload your pending document(s) so we can continue your loan process. Thank you.' AS body,
    JSON_ARRAY('client_name','task_name') AS variables
) AS seed
WHERE @creator_broker_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM templates t
    WHERE t.tenant_id = @target_tenant_id
      AND t.template_type = 'whatsapp'
      AND t.name = CONVERT(seed.name USING utf8mb4) COLLATE utf8mb4_unicode_ci
  );

COMMIT;
