CREATE TABLE patreon_tokens (
  id integer PRIMARY KEY CHECK (id = 1),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  seeded_from text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
