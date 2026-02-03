-- Fix tasks that are missing template_id
-- This migration links tasks to their correct templates based on task_type

-- Update INE Verification task (task_type: document_verification)
UPDATE tasks 
SET template_id = 18 
WHERE id = 10 
  AND title = 'INE Verification'
  AND template_id IS NULL;

-- Update Income Verification task if exists
UPDATE tasks 
SET template_id = (
  SELECT id FROM task_templates 
  WHERE title = 'Income Verification' 
  LIMIT 1
)
WHERE title = 'Income Verification' 
  AND template_id IS NULL;

-- General fix: Link tasks to templates by matching title
-- (Only updates tasks where template_id is NULL)
UPDATE tasks t
INNER JOIN task_templates tt ON t.title = tt.title
SET t.template_id = tt.id
WHERE t.template_id IS NULL;

-- Verification query to check results
-- SELECT id, title, template_id, task_type, status 
-- FROM tasks 
-- WHERE template_id IS NULL OR template_id IS NOT NULL
-- ORDER BY id;
