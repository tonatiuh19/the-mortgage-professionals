-- Migration: Seed tenant 2 task templates for public application auto-assignment
-- Date: 2026-05-25 15:00:00
-- Description:
--   1) Clone templates from tenant 1 to tenant 2 when available
--   2) Ensure tenant 2 has every template title used by auto-assignment logic
--   3) Ensure each required template has a default document upload form field

START TRANSACTION;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1) Clone existing tenant 1 templates to tenant 2 (safe no-op when tenant 1 is empty)
INSERT INTO task_templates (
  tenant_id,
  title,
  description,
  task_type,
  priority,
  default_due_days,
  order_index,
  is_active,
  created_by_broker_id,
  requires_documents,
  document_instructions,
  has_custom_form,
  has_signing,
  created_at,
  updated_at
)
SELECT
  2 AS tenant_id,
  src.title,
  src.description,
  src.task_type,
  src.priority,
  src.default_due_days,
  src.order_index,
  src.is_active,
  COALESCE(
    (SELECT b.id FROM brokers b WHERE b.tenant_id = 2 AND b.role = 'admin' ORDER BY b.id ASC LIMIT 1),
    (SELECT b.id FROM brokers b WHERE b.tenant_id = 2 ORDER BY b.id ASC LIMIT 1),
    src.created_by_broker_id
  ) AS created_by_broker_id,
  src.requires_documents,
  src.document_instructions,
  src.has_custom_form,
  src.has_signing,
  NOW(),
  NOW()
FROM task_templates src
WHERE src.tenant_id = 1
  AND NOT EXISTS (
    SELECT 1
    FROM task_templates t2
    WHERE t2.tenant_id = 2
      AND t2.title = src.title
  );

-- 2) Ensure every auto-assignment template exists for tenant 2
INSERT INTO task_templates (
  tenant_id,
  title,
  description,
  task_type,
  priority,
  default_due_days,
  order_index,
  is_active,
  created_by_broker_id,
  requires_documents,
  document_instructions,
  has_custom_form,
  has_signing,
  created_at,
  updated_at
)
SELECT
  2,
  seed.title,
  seed.description,
  'document_verification',
  seed.priority,
  seed.default_due_days,
  seed.order_index,
  1,
  COALESCE(
    (SELECT b.id FROM brokers b WHERE b.tenant_id = 2 AND b.role = 'admin' ORDER BY b.id ASC LIMIT 1),
    (SELECT b.id FROM brokers b WHERE b.tenant_id = 2 ORDER BY b.id ASC LIMIT 1)
  ),
  1,
  seed.document_instructions,
  0,
  0,
  NOW(),
  NOW()
FROM (
  SELECT 'Government-Issued ID' AS title,
         'Provide a valid government-issued photo ID.' AS description,
         'high' AS priority,
         7 AS default_due_days,
         1 AS order_index,
         'Attach a clear image/PDF of a valid government-issued photo ID.' AS document_instructions
  UNION ALL SELECT 'Social Security Card (SSN)', 'Provide your Social Security card.', 'high', 7, 2, 'Attach a clear copy of your Social Security card.'
  UNION ALL SELECT '2 Months Bank Statements', 'Provide your last two months of bank statements for all accounts.', 'medium', 10, 3, 'Attach the last two months of all bank account statements.'
  UNION ALL SELECT 'Green Card (Permanent Resident Card)', 'Provide a copy of your Permanent Resident Card (Green Card).', 'high', 7, 4, 'Attach front and back of your Green Card.'
  UNION ALL SELECT 'Visa / Work Authorization Document', 'Provide your visa or work authorization documentation.', 'high', 7, 5, 'Attach your current visa or work authorization document.'
  UNION ALL SELECT 'ITIN Assignment Letter', 'Provide your ITIN assignment letter.', 'high', 7, 6, 'Attach the IRS ITIN assignment letter.'
  UNION ALL SELECT 'W-2 Form', 'Provide your latest W-2 form.', 'high', 10, 7, 'Attach your most recent W-2 form.'
  UNION ALL SELECT 'Most Recent Pay-Stubs (1 Month)', 'Provide your most recent one month of pay stubs.', 'high', 10, 8, 'Attach consecutive pay stubs covering at least one month.'
  UNION ALL SELECT 'Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)', 'Provide federal tax returns or Schedule C for the last two years.', 'high', 14, 9, 'Attach complete signed tax returns or Schedule C for the last two years.'
  UNION ALL SELECT '1099 Forms (Last 2 Years)', 'Provide your 1099 forms for the last two years.', 'high', 14, 10, 'Attach all 1099 forms from the last two years.'
  UNION ALL SELECT 'Profit & Loss Statement (Current Year)', 'Provide current year profit and loss statement.', 'high', 14, 11, 'Attach your year-to-date profit and loss statement.'
  UNION ALL SELECT 'Federal Tax Returns Last 2 Years Including Business Tax Returns', 'Provide personal and business tax returns for the last two years.', 'high', 14, 12, 'Attach Form 1040 and relevant business returns (Schedule C/1120-S/1065).' 
  UNION ALL SELECT 'Social Security Award Letter', 'Provide your Social Security award letter.', 'medium', 10, 13, 'Attach your Social Security award letter.'
  UNION ALL SELECT 'Pension / Retirement Award Letter', 'Provide your pension or retirement award letter.', 'medium', 10, 14, 'Attach your pension or retirement award letter.'
  UNION ALL SELECT 'Insurance Policy', 'Provide the current homeowners/property insurance policy.', 'medium', 10, 15, 'Attach your policy declaration page with coverage details.'
  UNION ALL SELECT 'Current Mortgage Statement / Payoff Letter', 'Provide your latest mortgage statement or payoff letter.', 'high', 7, 16, 'Attach your current mortgage statement or payoff letter.'
  UNION ALL SELECT 'HOA Statement & Master Insurance Policy', 'Provide HOA statement and master insurance policy.', 'medium', 14, 17, 'Attach HOA statement and master insurance policy documents.'
  UNION ALL SELECT 'Mortgage Statement', 'Provide the latest mortgage statement for the property.', 'medium', 10, 18, 'Attach your latest mortgage statement.'
  UNION ALL SELECT 'Existing Lease Agreements', 'Provide existing lease agreements for rental properties.', 'medium', 14, 19, 'Attach all active lease agreements.'
) AS seed
WHERE EXISTS (SELECT 1 FROM brokers WHERE tenant_id = 2)
  AND NOT EXISTS (
    SELECT 1
    FROM task_templates t
    WHERE t.tenant_id = 2
        AND t.title = CONVERT(seed.title USING utf8mb4) COLLATE utf8mb4_unicode_ci
  );

-- 3) Ensure document upload form field exists for required tenant 2 templates
INSERT INTO task_form_fields (
  task_template_id,
  field_name,
  field_label,
  field_type,
  is_required,
  order_index,
  help_text,
  created_at
)
SELECT
  t.id,
  'document_upload',
  'Attach Document',
  'file_pdf',
  1,
  0,
  COALESCE(t.document_instructions, 'Attach the requested supporting document.'),
  NOW()
FROM task_templates t
WHERE t.tenant_id = 2
  AND t.requires_documents = 1
  AND t.title IN (
    'Government-Issued ID',
    'Social Security Card (SSN)',
    '2 Months Bank Statements',
    'Green Card (Permanent Resident Card)',
    'Visa / Work Authorization Document',
    'ITIN Assignment Letter',
    'W-2 Form',
    'Most Recent Pay-Stubs (1 Month)',
    'Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)',
    '1099 Forms (Last 2 Years)',
    'Profit & Loss Statement (Current Year)',
    'Federal Tax Returns Last 2 Years Including Business Tax Returns',
    'Social Security Award Letter',
    'Pension / Retirement Award Letter',
    'Insurance Policy',
    'Current Mortgage Statement / Payoff Letter',
    'HOA Statement & Master Insurance Policy',
    'Mortgage Statement',
    'Existing Lease Agreements'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM task_form_fields f
    WHERE f.task_template_id = t.id
      AND f.field_name = 'document_upload'
  );

COMMIT;
