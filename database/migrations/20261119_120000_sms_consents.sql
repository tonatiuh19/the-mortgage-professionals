-- SMS consent audit trail (A2P 10DLC / TCPA proof of opt-in).
-- One row per form submission that collected a phone number, whether or not
-- the boxes were checked, so we can prove exactly what the person saw.
CREATE TABLE IF NOT EXISTS sms_consents (
  id                  INT           NOT NULL AUTO_INCREMENT,
  tenant_id           INT           NOT NULL,
  phone_last10        VARCHAR(10)   NOT NULL,
  phone_raw           VARCHAR(30)   NULL,
  email               VARCHAR(255)  NULL,
  client_id           INT           NULL COMMENT 'clients.id when the submission created/matched a client',
  source              VARCHAR(40)   NOT NULL COMMENT 'apply_wizard | home_lead_form | contact_form | scheduler_booking',
  source_ref_id       INT           NULL COMMENT 'Row id in the source table (application, contact submission, meeting)',
  transactional_opt_in TINYINT(1)   NOT NULL DEFAULT 0,
  marketing_opt_in    TINYINT(1)    NOT NULL DEFAULT 0,
  transactional_text  TEXT          NOT NULL COMMENT 'Exact checkbox wording shown',
  marketing_text      TEXT          NOT NULL COMMENT 'Exact checkbox wording shown',
  consent_version     VARCHAR(20)   NOT NULL,
  page_url            VARCHAR(500)  NULL,
  ip_address          VARCHAR(64)   NULL,
  user_agent          VARCHAR(500)  NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sms_consents_phone (tenant_id, phone_last10, created_at),
  KEY idx_sms_consents_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable log of SMS opt-in checkbox state per public form submission';
