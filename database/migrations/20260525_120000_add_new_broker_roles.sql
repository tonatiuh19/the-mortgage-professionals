-- Migration: Expand broker role enum to support full role hierarchy
-- Date: 2026-05-25
-- Adds: loan_officer, loan_processor, realtor, buyers_agent, listing_agent
-- Keeps: broker (now Partner tier alias), admin

ALTER TABLE `brokers`
  MODIFY COLUMN `role` ENUM(
    'broker',
    'admin',
    'loan_officer',
    'loan_processor',
    'realtor',
    'buyers_agent',
    'listing_agent'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'broker';
