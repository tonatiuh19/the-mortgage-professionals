-- Migration: Remove all data related to tenant 1
-- Date: 2026-05-25 13:00:00
-- Description:
--   1) Snapshot tenant-1 IDs used by non-tenant dependency tables
--   2) Delete dependency rows in non-tenant tables
--   3) Delete all tenant-scoped rows where tenant_id = 1
--   4) Delete tenant record id = 1

SET @target_tenant_id := 1;

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_broker_ids;
CREATE TEMPORARY TABLE tmp_t1_broker_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_broker_ids (id)
SELECT id FROM brokers WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_client_ids;
CREATE TEMPORARY TABLE tmp_t1_client_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_client_ids (id)
SELECT id FROM clients WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_lead_ids;
CREATE TEMPORARY TABLE tmp_t1_lead_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_lead_ids (id)
SELECT id FROM leads WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_campaign_ids;
CREATE TEMPORARY TABLE tmp_t1_campaign_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_campaign_ids (id)
SELECT id FROM campaigns WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_checklist_ids;
CREATE TEMPORARY TABLE tmp_t1_checklist_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_checklist_ids (id)
SELECT id FROM compliance_checklists WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_flow_ids;
CREATE TEMPORARY TABLE tmp_t1_flow_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_flow_ids (id)
SELECT id FROM reminder_flows WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_task_template_ids;
CREATE TEMPORARY TABLE tmp_t1_task_template_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_task_template_ids (id)
SELECT id FROM task_templates WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_task_ids;
CREATE TEMPORARY TABLE tmp_t1_task_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_task_ids (id)
SELECT id FROM tasks WHERE tenant_id = @target_tenant_id;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_task_field_ids;
CREATE TEMPORARY TABLE tmp_t1_task_field_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_t1_task_field_ids (id)
SELECT id
FROM task_form_fields
WHERE task_template_id IN (SELECT id FROM tmp_t1_task_template_ids);

-- Non-tenant dependency cleanup first
DELETE FROM task_documents
WHERE task_id IN (SELECT id FROM tmp_t1_task_ids)
   OR field_id IN (SELECT id FROM tmp_t1_task_field_ids)
   OR uploaded_by_broker_id IN (SELECT id FROM tmp_t1_broker_ids)
   OR uploaded_by_user_id IN (SELECT id FROM tmp_t1_client_ids);

DELETE FROM task_form_responses
WHERE task_id IN (SELECT id FROM tmp_t1_task_ids)
   OR field_id IN (SELECT id FROM tmp_t1_task_field_ids)
   OR submitted_by_broker_id IN (SELECT id FROM tmp_t1_broker_ids)
   OR submitted_by_user_id IN (SELECT id FROM tmp_t1_client_ids);

DELETE FROM task_form_fields
WHERE task_template_id IN (SELECT id FROM tmp_t1_task_template_ids);

DELETE FROM reminder_flow_connections
WHERE flow_id IN (SELECT id FROM tmp_t1_flow_ids);

DELETE FROM reminder_flow_steps
WHERE flow_id IN (SELECT id FROM tmp_t1_flow_ids);

DELETE FROM compliance_checklist_items
WHERE checklist_id IN (SELECT id FROM tmp_t1_checklist_ids)
   OR completed_by_broker_id IN (SELECT id FROM tmp_t1_broker_ids);

DELETE FROM campaign_recipients
WHERE campaign_id IN (SELECT id FROM tmp_t1_campaign_ids)
   OR lead_id IN (SELECT id FROM tmp_t1_lead_ids)
   OR user_id IN (SELECT id FROM tmp_t1_client_ids);

DELETE FROM lead_activities
WHERE lead_id IN (SELECT id FROM tmp_t1_lead_ids)
   OR performed_by_broker_id IN (SELECT id FROM tmp_t1_broker_ids);

DELETE FROM broker_sessions
WHERE broker_id IN (SELECT id FROM tmp_t1_broker_ids);

DELETE FROM broker_profiles
WHERE broker_id IN (SELECT id FROM tmp_t1_broker_ids);

DELETE FROM user_sessions
WHERE user_id IN (SELECT id FROM tmp_t1_client_ids);

DELETE FROM user_profiles
WHERE user_id IN (SELECT id FROM tmp_t1_client_ids);

DELETE FROM revoked_tokens
WHERE user_id IN (SELECT id FROM tmp_t1_client_ids);

-- Tenant-scoped tables
DELETE FROM reminder_flow_step_logs WHERE tenant_id = @target_tenant_id;
DELETE FROM reminder_flow_executions WHERE tenant_id = @target_tenant_id;
DELETE FROM communications WHERE tenant_id = @target_tenant_id;
DELETE FROM conversation_threads WHERE tenant_id = @target_tenant_id;
DELETE FROM pre_approval_letters WHERE tenant_id = @target_tenant_id;
DELETE FROM documents WHERE tenant_id = @target_tenant_id;
DELETE FROM compliance_checklists WHERE tenant_id = @target_tenant_id;
DELETE FROM application_status_history WHERE tenant_id = @target_tenant_id;
DELETE FROM tasks WHERE tenant_id = @target_tenant_id;
DELETE FROM task_sign_documents WHERE tenant_id = @target_tenant_id;
DELETE FROM task_signatures WHERE tenant_id = @target_tenant_id;
DELETE FROM loan_applications WHERE tenant_id = @target_tenant_id;
DELETE FROM calendar_events WHERE tenant_id = @target_tenant_id;
DELETE FROM scheduled_meetings WHERE tenant_id = @target_tenant_id;
DELETE FROM scheduler_availability WHERE tenant_id = @target_tenant_id;
DELETE FROM scheduler_blocked_ranges WHERE tenant_id = @target_tenant_id;
DELETE FROM scheduler_settings WHERE tenant_id = @target_tenant_id;
DELETE FROM email_drafts WHERE tenant_id = @target_tenant_id;
DELETE FROM email_sync_log WHERE tenant_id = @target_tenant_id;
DELETE FROM email_attachment_cache WHERE tenant_id = @target_tenant_id;
DELETE FROM email_signatures WHERE tenant_id = @target_tenant_id;
DELETE FROM conversation_email_mailboxes WHERE tenant_id = @target_tenant_id;
DELETE FROM campaigns WHERE tenant_id = @target_tenant_id;
DELETE FROM leads WHERE tenant_id = @target_tenant_id;
DELETE FROM clients WHERE tenant_id = @target_tenant_id;
DELETE FROM broker_monthly_metrics WHERE tenant_id = @target_tenant_id;
DELETE FROM realtor_prospects WHERE tenant_id = @target_tenant_id;
DELETE FROM reminder_flows WHERE tenant_id = @target_tenant_id;
DELETE FROM pipeline_step_templates WHERE tenant_id = @target_tenant_id;
DELETE FROM templates WHERE tenant_id = @target_tenant_id;
DELETE FROM contact_submissions WHERE tenant_id = @target_tenant_id;
DELETE FROM notifications WHERE tenant_id = @target_tenant_id;
DELETE FROM system_settings WHERE tenant_id = @target_tenant_id;
DELETE FROM audit_logs WHERE tenant_id = @target_tenant_id;
DELETE FROM ai_chat_sessions WHERE tenant_id = @target_tenant_id;
DELETE FROM admin_section_controls WHERE tenant_id = @target_tenant_id;
DELETE FROM brokers WHERE tenant_id = @target_tenant_id;
DELETE FROM tenant_domains WHERE tenant_id = @target_tenant_id;

DELETE FROM tenants WHERE id = @target_tenant_id;

COMMIT;

DROP TEMPORARY TABLE IF EXISTS tmp_t1_broker_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_client_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_lead_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_campaign_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_checklist_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_flow_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_task_template_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_task_ids;
DROP TEMPORARY TABLE IF EXISTS tmp_t1_task_field_ids;
