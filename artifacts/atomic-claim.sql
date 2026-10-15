-- Proposed pattern, not a deployable migration. Uses the tables in data-model.sql.
-- Named bind parameters are supplied by an application. Execute each statement
-- atomically. An empty RETURNING result means no claim/completion was won.

-- Claim only known-pending work. A timed-out external effect is UNKNOWN until
-- native readback resolves it; do not automatically reclaim that effect here.
UPDATE portfolio_action
SET state = 'leased', claim_token = :new_claim_token,
    processing_until = now() + interval '5 minutes', attempts = attempts + 1
WHERE tenant_id = :tenant_id AND event_id = :event_id AND action_kind = :action_kind
  AND state = 'pending' AND attempts < 3
RETURNING *;

-- A confirmed native receipt completes only the exact current claim.
UPDATE portfolio_action
SET state = 'acknowledged', native_receipt = :native_receipt,
    claim_token = NULL, processing_until = NULL
WHERE tenant_id = :tenant_id AND event_id = :event_id AND action_kind = :action_kind
  AND state = 'leased' AND claim_token = :owned_claim_token
  AND processing_until > now()
RETURNING *;

-- Expiry means the outcome needs reconciliation, not that the external action failed.
UPDATE portfolio_action
SET state = 'unknown', claim_token = NULL, processing_until = NULL
WHERE state = 'leased' AND processing_until <= now()
RETURNING tenant_id, event_id, action_kind;

-- Known failures can return to pending only with budget remaining. The caller
-- supplies the claim token; this cannot terminate a different worker's action.
UPDATE portfolio_action
SET state = CASE WHEN attempts >= 3 THEN 'terminal' ELSE 'pending' END,
    claim_token = NULL, processing_until = NULL
WHERE tenant_id = :tenant_id AND event_id = :event_id AND action_kind = :action_kind
  AND state = 'leased' AND claim_token = :owned_claim_token
  AND processing_until > now()
RETURNING *;

-- UNKNOWN resolution requires provider evidence outside this illustration.
-- Never describe this database pattern as distributed exactly-once delivery.
