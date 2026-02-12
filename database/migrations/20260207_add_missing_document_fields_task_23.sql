-- Add missing document fields for task template ID 23
-- Task template 23 requires documents but has no form fields created

-- First update the task template to indicate it has custom form fields
UPDATE task_templates 
SET has_custom_form = 1 
WHERE id = 23 AND tenant_id = 2;

-- Add the document upload fields
INSERT INTO task_form_fields (task_template_id, field_name, field_label, field_type, is_required, order_index, help_text) VALUES
(23, 'ine_front', 'INE Front', 'file_pdf', 1, 0, 'Upload the front side of your INE document'),
(23, 'ine_back', 'INE Back', 'file_pdf', 1, 1, 'Upload the back side of your INE document');