CREATE TABLE IF NOT EXISTS worlds (
  id text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0,
  fencing_token bigint NOT NULL DEFAULT 0,
  sim_version text NOT NULL,
  content_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS command_receipts (
  scope text NOT NULL,
  command_id text NOT NULL,
  request_hash text NOT NULL,
  result jsonb NOT NULL,
  world_revision bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, command_id)
);

CREATE TABLE IF NOT EXISTS event_outbox (
  sequence bigserial PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  world_id text NOT NULL,
  world_revision bigint NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  cause_ids jsonb NOT NULL,
  publish_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_outbox_world_revision_idx
  ON event_outbox (world_id, world_revision);
