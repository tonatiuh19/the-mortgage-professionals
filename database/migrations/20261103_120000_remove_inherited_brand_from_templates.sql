-- Remove another tenant's phone number and font from stored email/letter templates.
UPDATE templates
SET body = REPLACE(body, '<p>Need immediate help? Call us at <strong>(562) 337-0000</strong>.</p>', '<p>Need immediate help? Just reply to this email.</p>')
WHERE tenant_id = 2 AND id = 90002;

UPDATE system_settings
SET setting_value = REPLACE(setting_value, 'font-family: Arial, Helvetica, sans-serif', 'font-family: ''DM Sans'', Arial, Helvetica, sans-serif')
WHERE tenant_id = 2 AND setting_key = 'pre_approval_default_template';
