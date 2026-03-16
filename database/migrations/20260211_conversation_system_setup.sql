-- Migration: Add Conversation System Enhancements
-- Date: 2026-02-11
-- Description: Ensures conversation system is ready with indexes and constraints
-- Note: Ignore "Duplicate key name" errors if indexes already exist

-- Add indexes for better conversation query performance
-- (Ignore duplicate key errors if these already exist)
CREATE INDEX idx_conversations_tenant_broker ON conversation_threads(tenant_id, broker_id);
CREATE INDEX idx_conversations_status ON conversation_threads(status, tenant_id);
CREATE INDEX idx_conversations_priority ON conversation_threads(priority, tenant_id);
CREATE INDEX idx_conversations_last_message ON conversation_threads(last_message_at DESC);

CREATE INDEX idx_communications_conversation ON communications(conversation_id, tenant_id);
CREATE INDEX idx_communications_type ON communications(communication_type, tenant_id);
CREATE INDEX idx_communications_status ON communications(status, delivery_status);
CREATE INDEX idx_communications_created ON communications(created_at DESC);

-- Add indexes for templates
CREATE INDEX idx_templates_type ON templates(template_type, tenant_id);
CREATE INDEX idx_templates_active ON templates(is_active, tenant_id);
CREATE INDEX idx_templates_category ON templates(category, tenant_id);

-- Ensure all conversation system tables have proper constraints
-- (Ignore "Duplicate key name" errors if constraints already exist)

-- Conversation threads constraints
ALTER TABLE conversation_threads ADD CONSTRAINT chk_conversation_status CHECK (status IN ('active', 'archived', 'closed'));
ALTER TABLE conversation_threads ADD CONSTRAINT chk_conversation_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Communications constraints  
ALTER TABLE communications ADD CONSTRAINT chk_communication_type CHECK (communication_type IN ('email', 'sms', 'whatsapp', 'call', 'internal_note'));
ALTER TABLE communications ADD CONSTRAINT chk_communication_direction CHECK (direction IN ('inbound', 'outbound'));
ALTER TABLE communications ADD CONSTRAINT chk_communication_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read'));
ALTER TABLE communications ADD CONSTRAINT chk_delivery_status CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'rejected'));
ALTER TABLE communications ADD CONSTRAINT chk_message_type CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'template'));

-- Templates constraints
ALTER TABLE templates ADD CONSTRAINT chk_template_type CHECK (template_type IN ('email', 'sms', 'whatsapp'));
ALTER TABLE templates ADD CONSTRAINT chk_template_category CHECK (category IN ('welcome', 'reminder', 'update', 'follow_up', 'marketing', 'system'));

-- Add some useful sample templates if they don't exist
INSERT IGNORE INTO templates (tenant_id, name, description, template_type, category, subject, body, variables, is_active, usage_count, created_by_broker_id, created_at)
VALUES 
(1, 'Loan Application Welcome', 'Welcome message when application is created', 'sms', 'welcome', NULL, 
 'Hi {{client_name}}! Welcome to our loan process. Your application #{{application_id}} has been received. We\'ll review it within 24 hours. Questions? Reply here!', 
 '["client_name", "application_id"]', 1, 0, 1, NOW()),

(1, 'Document Upload Reminder', 'Remind client to upload missing documents', 'whatsapp', 'reminder', NULL,
 'Hello {{client_name}} 👋\n\nFriendly reminder: We need {{missing_documents}} for your loan application.\n\nUpload at: {{portal_link}}\n\nThanks!\n{{broker_name}}',
 '["client_name", "missing_documents", "portal_link", "broker_name"]', 1, 0, 1, NOW()),

(1, 'Loan Approved Notification', 'Congratulations email for approved loans', 'email', 'update', 'Great News! Your Loan is Approved 🎉',
 'Dear {{client_name}},\n\nCongratulations! Your loan application #{{application_id}} has been APPROVED!\n\n💰 Amount: ${{loan_amount}}\n📈 Rate: {{interest_rate}}%\n📅 Closing: {{closing_date}}\n\nNext steps:\n1. Review documents we\'ll send\n2. Schedule closing\n3. Prepare for your new home!\n\nBest regards,\n{{broker_name}}',
 '["client_name", "application_id", "loan_amount", "interest_rate", "closing_date", "broker_name"]', 1, 0, 1, NOW()),

(1, 'Quick Status Update', 'Brief status update via SMS', 'sms', 'update', NULL,
 'Update on loan #{{application_id}}: {{status_message}}. {{next_steps}} Questions? Call us! - {{broker_name}}',
 '["application_id", "status_message", "next_steps", "broker_name"]', 1, 0, 1, NOW()),

(2, 'Loan Application Welcome', 'Welcome message when application is created', 'sms', 'welcome', NULL, 
 'Hi {{client_name}}! Welcome to our loan process. Your application #{{application_id}} has been received. We\'ll review it within 24 hours. Questions? Reply here!', 
 '["client_name", "application_id"]', 1, 0, 7, NOW()),

(2, 'Document Upload Reminder', 'Remind client to upload missing documents', 'whatsapp', 'reminder', NULL,
 'Hello {{client_name}} 👋\n\nFriendly reminder: We need {{missing_documents}} for your loan application.\n\nUpload at: {{portal_link}}\n\nThanks!\n{{broker_name}}',
 '["client_name", "missing_documents", "portal_link", "broker_name"]', 1, 0, 7, NOW());

-- Update usage statistics
UPDATE templates SET usage_count = 0 WHERE usage_count IS NULL;

-- Add comment to track this migration
INSERT INTO audit_logs (tenant_id, broker_id, actor_type, action, entity_type, changes, status, created_at)
VALUES 
(1, 1, 'broker', 'system_migration', 'conversation_system', 
 '{"migration": "conversation_system_setup", "version": "1.0", "date": "2026-02-11"}', 'success', NOW()),
(2, 7, 'broker', 'system_migration', 'conversation_system',
 '{"migration": "conversation_system_setup", "version": "1.0", "date": "2026-02-11"}', 'success', NOW());