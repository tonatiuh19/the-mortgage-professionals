-- Billing launch: 14-day onboarding grace starting Nov 24, 2026 00:00 America/Los_Angeles,
-- then the enforced ladder (same mechanism as the real-state repo):
--   Nov 24 → Dec 8  : subscription_grace  (everything works, owner sees countdown)
--   Dec 8  → Dec 15 : subscription_restricted (paid sends blocked for everyone)
--   Dec 15 →        : subscription_suspended  (owner sees full billing wall)
-- Paying (Stripe subscription active/trialing) returns the tenant to healthy immediately.
--
-- Rollback snapshot (values before this migration, tenant 2):
--   billing_quota_mode = 'off', billing_grace_days = '2', billing_suspend_days = '7',
--   billing_onboarding_started_at = '2026-11-02T18:21:10.076Z',
--   tenant_subscription.status = 'canceled' (Stripe customer/subscription IDs NOT changed here).

-- 'canceled' maps straight to suspended (no grace); 'inactive' + onboarding start gives the grace.
-- Only the status changes — stripe_customer_id / stripe_subscription_id are left as-is.
UPDATE tenant_subscription
   SET status = 'inactive'
 WHERE tenant_id = 2 AND status = 'canceled';

-- setting_key is UNIQUE in system_settings, so these upsert the existing rows.
INSERT INTO system_settings (tenant_id, setting_key, setting_value, setting_type, description)
VALUES
  (2, 'billing_onboarding_started_at', '2026-11-24T08:00:00.000Z', 'string',
   'UTC ISO timestamp when billing went live — starts onboarding grace (Nov 24, 2026 00:00 PT)'),
  (2, 'billing_grace_days', '14', 'number',
   'Days of full access after onboarding start or a failed renewal'),
  (2, 'billing_suspend_days', '21', 'number',
   'Days from start until full suspension (grace + 7 days restricted)'),
  (2, 'billing_quota_mode', 'enforce', 'string',
   'off | shadow | warn | enforce — enforce blocks paid sends after grace and over quota')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description);
