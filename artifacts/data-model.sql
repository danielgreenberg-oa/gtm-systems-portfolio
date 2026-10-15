-- Proposed pattern. A minimal Postgres schema for reasoning about tenant-scoped
-- events and effects. It is not copied from production or a deployment migration.
-- Row-level security, grants, retention and vendor integrations are omitted.
CREATE TABLE portfolio_tenant (
  tenant_id text PRIMARY KEY
);
CREATE TABLE portfolio_lead (
  tenant_id text NOT NULL REFERENCES portfolio_tenant,
  lead_id text NOT NULL,
  version integer NOT NULL CHECK (version >= 0),
  lifecycle_state text NOT NULL,
  PRIMARY KEY (tenant_id, lead_id)
);
CREATE TABLE portfolio_event (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  lead_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  event_kind text NOT NULL,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES portfolio_lead (tenant_id, lead_id)
);
CREATE TABLE portfolio_action (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  action_kind text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'leased', 'acknowledged', 'unknown', 'terminal')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 3),
  claim_token uuid,
  processing_until timestamptz,
  native_receipt text,
  PRIMARY KEY (tenant_id, event_id, action_kind),
  FOREIGN KEY (tenant_id, event_id) REFERENCES portfolio_event (tenant_id, event_id),
  CHECK (state <> 'leased' OR (claim_token IS NOT NULL AND processing_until IS NOT NULL)),
  CHECK (state <> 'acknowledged' OR native_receipt IS NOT NULL)
);
