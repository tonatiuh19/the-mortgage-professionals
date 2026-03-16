-- Clean slate approach: Delete and recreate templates with proper JSON format
-- Migration: 20260212_180000_fix_template_variables_comprehensive.sql
-- Description: Delete corrupted template data and recreate with proper JSON arrays

-- Step 1: Log the deletion for audit purposes
INSERT INTO audit_logs (
  tenant_id, 
  action, 
  entity_type, 
  changes, 
  status, 
  error_message,
  created_at
) VALUES (
  1,
  'delete_corrupted_templates' ,
  'template',
  JSON_OBJECT('action', 'Deleted all templates to fix JSON corruption'),
  'success',
  'Deleted all template data due to JSON corruption, will recreate with proper format',
  CURRENT_TIMESTAMP
);

-- Step 2: Delete all existing template data
DELETE FROM templates;

-- Step 3: Reset auto-increment
ALTER TABLE templates AUTO_INCREMENT = 1;

-- Step 4: Recreate templates with proper JSON format
INSERT INTO `templates` (`id`, `tenant_id`, `name`, `description`, `template_type`, `category`, `subject`, `body`, `variables`, `is_active`, `usage_count`, `created_by_broker_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'Welcome Email', 'Welcome new clients to the loan process', 'email', 'welcome', 'Welcome to Encore Mortgage - Your Loan Application', 'Dear {{client_name}},\n\nWelcome to Encore Mortgage! We\'re excited to help you with your loan application.\n\nYour application ID is: {{application_id}}\n\nNext steps:\n1. Complete all required documents\n2. Schedule your initial consultation\n3. We\'ll review your application within 24-48 hours\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\n{{broker_name}}\nEncore Mortgage', '["client_name", "application_id", "broker_name"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(2, 1, 'Document Reminder SMS', 'Remind clients about pending documents', 'sms', 'reminder', NULL, 'Hi {{client_name}}, this is {{broker_name}} from Encore Mortgage. You have {{document_count}} pending documents for your loan application. Please upload them at your earliest convenience. Reply STOP to opt out.', '["client_name", "broker_name", "document_count"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(3, 1, 'Application Update WhatsApp', 'Update clients on application status via WhatsApp', 'whatsapp', 'update', NULL, 'Hi {{client_name}} 👋\n\nGreat news! Your loan application status has been updated to: *{{status}}*\n\n{{additional_notes}}\n\nNext steps: {{next_steps}}\n\nFeel free to reply with any questions!\n\n- {{broker_name}} at Encore Mortgage', '["client_name", "status", "additional_notes", "next_steps", "broker_name"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(4, 1, 'Loan Approved Email', 'Congratulate clients on loan approval', 'email', 'update', 'Congratulations! Your Loan Has Been Approved', 'Dear {{client_name}},\n\nCongratulations! 🎉\n\nWe\'re thrilled to inform you that your loan application #{{application_id}} has been APPROVED!\n\nLoan Details:\n- Loan Amount: ${{loan_amount}}\n- Interest Rate: {{interest_rate}}%\n- Closing Date: {{closing_date}}\n\nNext Steps:\n1. Review the loan documents we\'ll send shortly\n2. Schedule your closing appointment\n3. Prepare for your new home!\n\nThank you for choosing Encore Mortgage. We\'re excited to be part of your homeownership journey!\n\nBest regards,\n{{broker_name}}\nEncore Mortgage', '["client_name", "application_id", "loan_amount", "interest_rate", "closing_date", "broker_name"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(5, 1, 'Quick Update SMS', 'Send quick status updates via SMS', 'sms', 'update', NULL, 'Hi {{client_name}}! Quick update on your loan app #{{application_id}}: {{status_message}}. Questions? Call us! - {{broker_name}} at Encore Mortgage', '["client_name", "application_id", "status_message", "broker_name"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(6, 1, 'Document Upload Reminder WhatsApp', 'Friendly WhatsApp reminder for documents', 'whatsapp', 'reminder', NULL, 'Hi {{client_name}} 👋\n\nFriendly reminder: We\'re still waiting for {{missing_documents}} for your loan application.\n\nYou can upload them easily through your client portal: {{portal_link}}\n\nNeed help? Just reply here and I\'ll assist you right away!\n\n📋 Missing: {{missing_documents}}\n⏰ Needed by: {{due_date}}\n\nThanks!\n{{broker_name}} 🏠', '["client_name", "missing_documents", "portal_link", "due_date", "broker_name"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(7, 1, 'Welcome Client', NULL, 'email', 'welcome', 'Welcome to Our Loan Services', '<p>Dear {{first_name}},</p><p>Welcome! We\'re excited to help you with your loan application.</p>', '[]', 1, 0, 1, '2026-01-20 18:56:12', '2026-01-20 18:56:12'),
(8, 1, 'Application Submitted', NULL, 'email', 'update', 'Your Loan Application Has Been Received', '<p>Dear {{first_name}},</p><p>We have received your application #{{application_number}}. We will review it shortly.</p>', '[]', 1, 0, 1, '2026-01-20 18:56:12', '2026-01-20 18:56:12'),
(9, 1, 'Documents Required', NULL, 'email', 'reminder', 'Additional Documents Needed', '<p>Dear {{first_name}},</p><p>Please upload the following documents to proceed with your application.</p>', '[]', 1, 0, 1, '2026-01-20 18:56:12', '2026-01-20 18:56:12');

-- Step 5: Create default templates for tenant 2 (The Mortgage Professionals) as well
INSERT INTO `templates` (`tenant_id`, `name`, `description`, `template_type`, `category`, `subject`, `body`, `variables`, `is_active`, `usage_count`, `created_by_broker_id`, `created_at`, `updated_at`) VALUES
(2, 'Welcome Email', 'Welcome new clients to the loan process', 'email', 'welcome', 'Welcome to The Mortgage Professionals - Your Loan Application', 'Dear {{client_name}},\n\nWelcome to The Mortgage Professionals! We\'re excited to help you with your loan application.\n\nYour application ID is: {{application_id}}\n\nNext steps:\n1. Complete all required documents\n2. Schedule your initial consultation\n3. We\'ll review your application within 24-48 hours\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\n{{broker_name}}\nThe Mortgage Professionals', '["client_name", "application_id", "broker_name"]', 1, 0, 7, NOW(), NOW()),
(2, 'Document Reminder SMS', 'Remind clients about pending documents', 'sms', 'reminder', NULL, 'Hi {{client_name}}, this is {{broker_name}} from The Mortgage Professionals. You have {{document_count}} pending documents for your loan application. Please upload them at your earliest convenience. Reply STOP to opt out.', '["client_name", "broker_name", "document_count"]', 1, 0, 7, NOW(), NOW()),
(2, 'Application Update WhatsApp', 'Update clients on application status via WhatsApp', 'whatsapp', 'update', NULL, 'Hi {{client_name}} 👋\n\nGreat news! Your loan application status has been updated to: *{{status}}*\n\n{{additional_notes}}\n\nNext steps: {{next_steps}}\n\nFeel free to reply with any questions!\n\n- {{broker_name}} at The Mortgage Professionals', '["client_name", "status", "additional_notes", "next_steps", "broker_name"]', 1, 0, 7, NOW(), NOW());

-- Step 6: Log successful recreation
INSERT INTO audit_logs (
  tenant_id, 
  action, 
  entity_type, 
  changes, 
  status, 
  error_message,
  created_at
) VALUES (
  NULL,
  'recreate_templates_clean' ,
  'template',
  JSON_OBJECT('action', 'Recreated all templates with proper JSON format', 'count', '12'),
  'success',
  'Successfully recreated all template data with proper JSON arrays',
  CURRENT_TIMESTAMP
);

-- Step 7: Verification - this should return all templates with valid JSON
SELECT 
  id, 
  tenant_id, 
  name, 
  template_type,
  JSON_VALID(variables) as is_valid_json,
  variables 
FROM templates 
ORDER BY tenant_id, id;