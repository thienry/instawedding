-- Guests check their captions and cards against the banned terms before
-- posting, so they read the list. Only the admin API changes it.
BEGIN;

GRANT SELECT ON public.banned_terms TO anon, authenticated;

DROP POLICY IF EXISTS "Read banned terms" ON public.banned_terms;
CREATE POLICY "Read banned terms" ON public.banned_terms
  FOR SELECT TO anon, authenticated
  USING (true);

COMMIT;
