-- Apply AFTER the code that uses the admin API is deployed and tested.
-- client_session_id holds the Supabase Auth user id of the signed-in guest.
BEGIN;

-- Permissive policies are combined with OR, so remove every existing one.
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('posts', 'challenges', 'likes', 'ceremonialists')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END
$$;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceremonialists ENABLE ROW LEVEL SECURITY;

-- posts: everyone reads approved ones; guests create and delete their own.
CREATE POLICY "Read approved or own posts" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (
    is_approved OR client_session_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Guests create their own posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    client_session_id = (SELECT auth.uid())::text
    AND is_approved
    AND likes_count = 0
    AND char_length(author_name) BETWEEN 1 AND 120
    AND (caption IS NULL OR char_length(caption) <= 2000)
    AND media_url ~ '^(/media/|https://)'
  );

CREATE POLICY "Guests delete their own posts" ON public.posts
  FOR DELETE TO authenticated
  USING (client_session_id = (SELECT auth.uid())::text);

-- challenges: read only. ceremonialists: no client access.
CREATE POLICY "Read challenges" ON public.challenges
  FOR SELECT TO anon, authenticated
  USING (true);

-- likes: guests manage only their own.
CREATE POLICY "Read own likes" ON public.likes
  FOR SELECT TO authenticated
  USING (client_session_id = (SELECT auth.uid())::text);

CREATE POLICY "Create own likes" ON public.likes
  FOR INSERT TO authenticated
  WITH CHECK (client_session_id = (SELECT auth.uid())::text);

CREATE POLICY "Delete own likes" ON public.likes
  FOR DELETE TO authenticated
  USING (client_session_id = (SELECT auth.uid())::text);

-- Recount instead of trusting the caller, so repeated calls cannot inflate it.
CREATE OR REPLACE FUNCTION public.increment_likes(target_post_id UUID)
RETURNS public.posts
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.posts
  SET likes_count = (
    SELECT count(*) FROM public.likes WHERE post_id = target_post_id
  )
  WHERE id = target_post_id
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.decrement_likes(target_post_id UUID)
RETURNS public.posts
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM public.increment_likes(target_post_id);
$$;

REVOKE ALL ON FUNCTION public.increment_likes(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decrement_likes(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_likes(UUID) TO authenticated;

COMMIT;
