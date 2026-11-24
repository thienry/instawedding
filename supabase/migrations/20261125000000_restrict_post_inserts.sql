-- Guests only choose these columns. The rest, such as created_at, likes_count
-- and is_approved, keep their defaults.
BEGIN;

REVOKE INSERT ON public.posts FROM anon, authenticated;
GRANT INSERT (
  id, author_name, author_avatar_url, media_url, caption, challenge_id,
  client_session_id, show_on_projector
) ON public.posts TO authenticated;

DROP POLICY IF EXISTS "Guests create their own posts" ON public.posts;
CREATE POLICY "Guests create their own posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    client_session_id = (SELECT auth.uid())::text
    AND is_approved
    AND likes_count = 0
    AND char_length(btrim(author_name)) BETWEEN 1 AND 120
    AND (caption IS NULL OR char_length(caption) <= 2000)
    AND (author_avatar_url IS NULL OR author_avatar_url ~ '^https://')
    -- Only media uploaded through the app
    AND media_url ~ '^/media/uploads/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}\.[a-z0-9]{3,4}$'
  );

COMMIT;
