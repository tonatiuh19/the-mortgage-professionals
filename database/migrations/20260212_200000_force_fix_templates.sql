-- Force fix for templates 10, 11, 12 without condition matching
-- Migration: 20260212_200000_force_fix_templates.sql
-- Description: Force update templates 10, 11, 12 to proper JSON format

-- Force fix template 10 (no WHERE condition on variables content)
UPDATE templates 
SET variables = '["client_name", "application_id", "broker_name"]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 10 AND tenant_id = 2;

-- Force fix template 11
UPDATE templates 
SET variables = '["client_name", "broker_name", "document_count"]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 11 AND tenant_id = 2;

-- Force fix template 12
UPDATE templates 
SET variables = '["client_name", "status", "additional_notes", "next_steps", "broker_name"]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 12 AND tenant_id = 2;

-- Also fix any other corrupted templates in tenant 2
UPDATE templates 
SET variables = CASE 
    WHEN variables LIKE '%client_name,application_id,broker_name%' THEN '["client_name", "application_id", "broker_name"]'
    WHEN variables LIKE '%client_name,broker_name,document_count%' THEN '["client_name", "broker_name", "document_count"]'
    WHEN variables LIKE '%client_name,status,additional_notes%' THEN '["client_name", "status", "additional_notes", "next_steps", "broker_name"]'
    WHEN variables NOT LIKE '[%' AND variables LIKE '%,%' THEN CONCAT('["', REPLACE(variables, ',', '","'), '"]')
    WHEN variables IS NULL OR variables = '' THEN '[]'
    ELSE variables
END,
updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 2 AND (variables NOT LIKE '[%' OR variables IS NULL);

-- Log the forced update
INSERT INTO audit_logs (
  tenant_id, 
  action, 
  entity_type, 
  changes, 
  status, 
  error_message,
  created_at
) VALUES 
(2, 'force_fix_templates', 'template', JSON_OBJECT('templates_fixed', '10,11,12', 'method', 'forced_update'), 'success', 'Force updated templates 10,11,12 to fix JSON corruption', CURRENT_TIMESTAMP);

-- Verification - show all templates for tenant 2
SELECT 
  id,
  name,
  template_type,
  JSON_VALID(variables) as is_valid_json,
  variables
FROM templates 
WHERE tenant_id = 2
ORDER BY id;