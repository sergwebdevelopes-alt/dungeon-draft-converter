CREATE TABLE maps (
  post_id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  tags text[] NOT NULL DEFAULT '{}',
  squares_x integer,
  squares_y integer,
  patreon_url text NOT NULL,
  published_at timestamptz NOT NULL,
  image_url text NOT NULL,
  image_width integer NOT NULL,
  image_height integer NOT NULL,
  image_media_id text NOT NULL,
  image_is_main boolean NOT NULL,
  image_file_name text,
  source jsonb NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX maps_published_at ON maps (published_at DESC);
