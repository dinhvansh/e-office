CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  deduplication_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TIMESTAMP(3),
  processed_at TIMESTAMP(3),
  last_error TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS outbox_events_status_available_at_idx
  ON outbox_events(status, available_at);

CREATE INDEX IF NOT EXISTS outbox_events_aggregate_type_aggregate_id_idx
  ON outbox_events(aggregate_type, aggregate_id);
