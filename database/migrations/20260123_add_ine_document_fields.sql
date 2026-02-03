-- Clean tasks and add file upload fields to INE Verification template
-- Migration: 20260123_add_ine_document_fields.sql

-- Clean existing incomplete tasks
DELETE FROM task_documents WHERE task_id IN (SELECT id FROM tasks WHERE status IN ('pending', 'in_progress'));
DELETE FROM task_form_responses WHERE task_id IN (SELECT id FROM tasks WHERE status IN ('pending', 'in_progress'));
DELETE FROM tasks WHERE status IN ('pending', 'in_progress');

-- Delete existing form fields for template 18 to avoid duplicates
DELETE FROM task_form_fields WHERE task_template_id = 18;

-- Add text field + file upload fields to INE Verification template
INSERT INTO `task_form_fields` 
  (`task_template_id`, `field_name`, `field_label`, `field_type`, `is_required`, `placeholder`, `order_index`, `help_text`) 
VALUES 
  (18, 'enter_your_ine_number', 'Enter your INE number', 'text', 1, 'Enter your INE number', 0, NULL),
  (18, 'ine_front_photo', 'INE Front Photo', 'file_image', 1, NULL, 1, 'Upload a clear photo of the front of your INE'),
  (18, 'ine_back_photo', 'INE Back Photo', 'file_image', 1, NULL, 2, 'Upload a clear photo of the back of your INE'),
  (18, 'proof_of_address', 'Proof of Address (PDF)', 'file_pdf', 0, NULL, 3, 'Upload a recent utility bill or bank statement (optional)');
