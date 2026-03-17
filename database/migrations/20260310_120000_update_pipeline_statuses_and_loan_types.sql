-- Migration: Update pipeline statuses and loan types
-- Date: 2026-03-10 12:00:00
-- Description:
--   1. Replace loan_applications.status ENUM with new pipeline statuses
--   2. Simplify loan_applications.loan_type ENUM to only purchase/refinance
--   3. Update application_status_history from_status/to_status columns to accept new values
--   4. Migrate existing records to nearest equivalent new status

-- ─── STEP 1: Migrate existing status values to new equivalents ──────────────
-- Mapping:
--   draft                → app_sent
--   submitted            → application_received
--   under_review         → application_received
--   documents_pending    → application_received
--   underwriting         → submitted_to_underwriting
--   conditional_approval → approved_with_conditions
--   approved             → clear_to_close
--   closed               → loan_funded
--   denied               → loan_funded   (keep as closest terminal — broker will correct)
--   cancelled            → loan_funded   (same reasoning)

UPDATE `loan_applications`
SET `status` = CASE `status`
  WHEN 'draft'                THEN 'app_sent'
  WHEN 'submitted'            THEN 'application_received'
  WHEN 'under_review'         THEN 'application_received'
  WHEN 'documents_pending'    THEN 'application_received'
  WHEN 'underwriting'         THEN 'submitted_to_underwriting'
  WHEN 'conditional_approval' THEN 'approved_with_conditions'
  WHEN 'approved'             THEN 'clear_to_close'
  WHEN 'closed'               THEN 'loan_funded'
  WHEN 'denied'               THEN 'loan_funded'
  WHEN 'cancelled'            THEN 'loan_funded'
  ELSE `status`
END;

-- ─── STEP 2: Update loan_applications.status ENUM ───────────────────────────
ALTER TABLE `loan_applications`
  MODIFY COLUMN `status` ENUM(
    'app_sent',
    'application_received',
    'prequalified',
    'preapproved',
    'under_contract_loan_setup',
    'submitted_to_underwriting',
    'approved_with_conditions',
    'clear_to_close',
    'docs_out',
    'loan_funded'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'app_sent';

-- ─── STEP 3: Update loan_applications.loan_type ENUM ────────────────────────
-- Migrate existing non-standard loan types to nearest equivalent
UPDATE `loan_applications`
SET `loan_type` = CASE `loan_type`
  WHEN 'home_equity'   THEN 'refinance'
  WHEN 'commercial'    THEN 'purchase'
  WHEN 'construction'  THEN 'purchase'
  WHEN 'other'         THEN 'purchase'
  ELSE `loan_type`
END
WHERE `loan_type` NOT IN ('purchase', 'refinance');

ALTER TABLE `loan_applications`
  MODIFY COLUMN `loan_type` ENUM('purchase', 'refinance')
    COLLATE utf8mb4_unicode_ci NOT NULL;

-- ─── STEP 4: Widen application_status_history columns ───────────────────────
-- Use VARCHAR instead of ENUM so status history is flexible
ALTER TABLE `application_status_history`
  MODIFY COLUMN `from_status` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  MODIFY COLUMN `to_status`   VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL;
