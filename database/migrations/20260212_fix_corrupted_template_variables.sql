-- Fix corrupted JSON data in templates.variables column
-- Migration: 20260212_fix_corrupted_template_variables.sql
-- Description: Clean up malformed JSON in template variables


-- First, identify and fix any corrupted JSON in the variables column
-- This will update any row where variables is not null, not an empty string, and not valid JSON

-- Convert comma-separated strings to valid JSON arrays
UPDATE templates 
SET variables = CASE 
    WHEN variables IS NOT NULL 
         AND variables != '' 
         AND variables != 'null'
         AND NOT JSON_VALID(variables)
         AND variables NOT LIKE '%[%' -- Not already JSON array format
    THEN CONCAT('["', REPLACE(variables, ',', '","'), '"]')
    ELSE variables
END,
updated_at = CURRENT_TIMESTAMP
WHERE variables IS NOT NULL 
  AND variables != '' 
  AND variables != 'null'
  AND NOT JSON_VALID(variables);

-- Log the issue for audit purposes  
INSERT INTO audit_logs (
  tenant_id, 
  action, 
  entity_type, 
  entity_id, 
  changes, 
  status, 
  error_message,
  created_at
) 
SELECT DISTINCT
  tenant_id,
  'fix_corrupted_variables' as action,
  'template' as entity_type,
  id as entity_id,
  JSON_OBJECT(
    'old_variables', variables, 
    'new_variables', CASE 
      WHEN variables IS NOT NULL 
           AND variables != '' 
           AND variables != 'null'
           AND NOT JSON_VALID(variables)
           AND variables NOT LIKE '%[%'
      THEN CONCAT('["', REPLACE(variables, ',', '","'), '"]')
      ELSE variables
    END
  ) as changes,
  'success' as status,
  'Fixed corrupted JSON in template variables column - converted comma-separated to JSON array' as error_message,
  CURRENT_TIMESTAMP as created_at
FROM templates 
WHERE variables IS NOT NULL 
  AND variables != '' 
  AND variables != 'null'
  AND NOT JSON_VALID(variables);

-- Ensure all NULL variables are set to empty JSON arrays for consistency 
UPDATE templates 
SET variables = '[]', 
    updated_at = CURRENT_TIMESTAMP
WHERE variables IS NULL;