-- Additive: apply BEFORE deploying the code that uses it.
BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;

-- Counts one hit and returns whether it is within the limit.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_max INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_hits INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE expires_at < now() - interval '1 hour';

  INSERT INTO public.rate_limits AS r (key, hits, expires_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN r.expires_at <= now() THEN 1 ELSE r.hits + 1 END,
    expires_at = CASE
      WHEN r.expires_at <= now() THEN excluded.expires_at
      ELSE r.expires_at
    END
  RETURNING r.hits INTO v_hits;

  RETURN v_hits <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

COMMIT;
