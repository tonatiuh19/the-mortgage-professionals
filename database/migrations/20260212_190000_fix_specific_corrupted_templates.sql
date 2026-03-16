-- Direct fix for specific corrupted templates
-- Migration: 20260212_190000_fix_specific_corrupted_templates.sql
-- Description: Direct SQL to fix templates 10, 11, and 12 with corrupted JSON

-- Fix template 10
UPDATE templates 
SET variables = '["client_name", "application_id", "broker_name"]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 10 
  AND tenant_id = 2
  AND variables = 'client_name,application_id,broker_name';

-- Fix template 11  
UPDATE templates 
SET variables = '["client_name", "broker_name", "document_count"]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 11 
  AND tenant_id = 2
  AND variables = 'client_name,broker_name,document_count';

-- Fix template 12
UPDATE templates 
SET variables = '["client_name", "status", "additional_notes", "next_steps", "broker_name"]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 12 
  AND tenant_id = 2
  AND variables = 'client_name,status,additional_notes,next_steps,broker_name';

-- Log the changes
INSERT INTO audit_logs (
  tenant_id, 
  action, 
  entity_type, 
  entity_id, 
  changes, 
  status, 
  error_message,
  created_at
) VALUES 
(2, 'fix_corrupted_json', 'template', 10, JSON_OBJECT('old', 'client_name,application_id,broker_name', 'new', '["client_name", "application_id", "broker_name"]'), 'success', 'Fixed corrupted JSON for template 10', CURRENT_TIMESTAMP),
(2, 'fix_corrupted_json', 'template', 11, JSON_OBJECT('old', 'client_name,broker_name,document_count', 'new', '["client_name", "broker_name", "document_count"]'), 'success', 'Fixed corrupted JSON for template 11', CURRENT_TIMESTAMP),
(2, 'fix_corrupted_json', 'template', 12, JSON_OBJECT('old', 'client_name,status,additional_notes,next_steps,broker_name', 'new', '["client_name", "status", "additional_notes", "next_steps", "broker_name"]'), 'success', 'Fixed corrupted JSON for template 12', CURRENT_TIMESTAMP);

-- Verification query
SELECT 
  id, 
  tenant_id, 
  name, 
  JSON_VALID(variables) as is_valid_json,
  variables 
FROM templates 
WHERE id IN (10, 11, 12)
ORDER BY id;