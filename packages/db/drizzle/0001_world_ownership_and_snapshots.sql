ALTER TABLE worlds
  ADD COLUMN IF NOT EXISTS owner_id text;

CREATE TABLE IF NOT EXISTS world_snapshots (
  world_id text NOT NULL,
  world_revision bigint NOT NULL,
  fencing_token bigint NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, world_revision)
);

CREATE INDEX IF NOT EXISTS world_snapshots_latest_idx
  ON world_snapshots (world_id, world_revision DESC);
