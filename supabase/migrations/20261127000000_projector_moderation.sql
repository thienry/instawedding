-- Moderators take posts off the projector, and list terms that keep a post
-- off it, without hiding anything from the feed. Additive: apply before
-- deploying the code.
BEGIN;

-- Guests cannot set it: their INSERT grant lists the columns they choose
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS hidden_from_projector BOOLEAN NOT NULL DEFAULT false;

-- Stored normalized (lower case, no accents). Only the admin API reads it.
CREATE TABLE IF NOT EXISTS public.banned_terms (
  term TEXT PRIMARY KEY CHECK (char_length(term) BETWEEN 1 AND 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banned_terms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.banned_terms FROM anon, authenticated;

COMMIT;
