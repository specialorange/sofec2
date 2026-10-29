-- One row per interaction the Sound of Fractions app reports.
CREATE TABLE IF NOT EXISTS logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  uid             TEXT,  -- random per-browser id from the app, not a person's name
  user_logged_in  TEXT,
  action          TEXT,  -- what the user just did, e.g. "clicked the plus sign on the Snare instrument."
  unsaved_actions TEXT,  -- earlier actions the browser had not delivered yet
  current_state   TEXT,  -- JSON snapshot of the rhythm after the action
  client_time     TEXT,  -- the browser's own timestamp
  country         TEXT,  -- from Cloudflare, two-letter code
  user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS logs_uid_time ON logs (uid, received_at);
CREATE INDEX IF NOT EXISTS logs_time ON logs (received_at);
