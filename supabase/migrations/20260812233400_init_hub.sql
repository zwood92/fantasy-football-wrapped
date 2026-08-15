-- Create newsletters table
CREATE TABLE newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id text NOT NULL,
  week integer NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create podcasts table
CREATE TABLE podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id text NOT NULL,
  week integer NOT NULL,
  audio_url text NOT NULL,
  transcript text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create an index for faster lookups
CREATE INDEX newsletters_league_week_idx ON newsletters(league_id, week);
CREATE INDEX podcasts_league_week_idx ON podcasts(league_id, week);
