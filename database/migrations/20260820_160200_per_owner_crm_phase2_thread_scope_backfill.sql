-- Per-Owner CRM — Phase 2: backfill owner_client_scope_broker_id on conversation_threads
-- Spec: docs/PER_OWNER_CRM_ARCHITECTURE.md §13 Phase 2
-- Non-breaking: additive denormalization only; flags remain OFF.

UPDATE `conversation_threads` ct
INNER JOIN `clients` c
  ON c.id = ct.client_id AND c.tenant_id = ct.tenant_id
SET ct.owner_client_scope_broker_id = COALESCE(c.assigned_broker_id, ct.broker_id)
WHERE ct.client_id IS NOT NULL
  AND ct.owner_client_scope_broker_id IS NULL;

-- Personal-line threads with broker but no client yet: stamp line owner as scope hint
UPDATE `conversation_threads` ct
SET ct.owner_client_scope_broker_id = ct.broker_id
WHERE ct.client_id IS NULL
  AND ct.broker_id IS NOT NULL
  AND ct.owner_client_scope_broker_id IS NULL;
