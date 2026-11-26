-- Moments of the party (first dance, cake...) are challenges that the
-- ceremonial puts on air. Additive: apply before deploying the code.
BEGIN;

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS is_moment BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS live_since TIMESTAMPTZ;

-- At most one moment on air
CREATE UNIQUE INDEX IF NOT EXISTS challenges_one_live_moment
  ON public.challenges ((true)) WHERE live_since IS NOT NULL;

-- The projector and the phones learn when a moment goes on air
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'challenges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
  END IF;
END
$$;

INSERT INTO public.challenges (title, description, icon, is_moment)
SELECT title, description, icon, true
FROM (
  VALUES
    ('Entrada dos Noivos', 'Mande seu post da entrada dos noivos!', '💒'),
    ('Primeira Dança', 'Mande seu post da primeira dança!', '💃'),
    ('Brinde', 'Mande seu post do brinde!', '🥂'),
    ('Corte do Bolo', 'Mande seu post do corte do bolo!', '🎂'),
    ('Buquê', 'Mande seu post da hora do buquê!', '💐')
) AS moment (title, description, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.challenges c WHERE c.is_moment AND c.title = moment.title
);

COMMIT;
