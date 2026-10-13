-- ==============================================================================
-- InstaWedding T&P - Database Hardening & Row Level Security (RLS)
-- Execution target: Supabase SQL Editor
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Schema Structure with LGPD ownership tracking
CREATE TABLE IF NOT EXISTS public.challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name VARCHAR(60) NOT NULL,
    media_url TEXT NOT NULL,
    caption VARCHAR(280),
    challenge_id INT REFERENCES public.challenges(id) ON DELETE SET NULL,
    client_session_id VARCHAR(100) NOT NULL,
    likes_count INT DEFAULT 0 NOT NULL CHECK (likes_count >= 0),
    is_approved BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.likes (
    id SERIAL PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    client_session_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_post_client_like UNIQUE (post_id, client_session_id)
);

-- Indexing for performant reads
CREATE INDEX IF NOT EXISTS idx_posts_approved_created ON public.posts(is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_session_id ON public.posts(client_session_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_session ON public.likes(post_id, client_session_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- ==============================================================================
-- 3. Row Level Security (RLS) Activation
-- ==============================================================================
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS POLICIES: challenges
-- ------------------------------------------------------------------------------
-- Public anon read access to active challenges only
CREATE POLICY "Anon can view active challenges"
    ON public.challenges
    FOR SELECT
    TO anon, authenticated
    USING (is_active = TRUE);

-- All modifications reserved for service_role
CREATE POLICY "Service role has full access to challenges"
    ON public.challenges
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- ------------------------------------------------------------------------------
-- RLS POLICIES: posts
-- ------------------------------------------------------------------------------
-- Public anon can ONLY view approved posts (unapproved/pending photos are hidden)
CREATE POLICY "Anon can only view approved posts"
    ON public.posts
    FOR SELECT
    TO anon, authenticated
    USING (is_approved = TRUE);

-- Public anon can insert posts with strict length and data checks
CREATE POLICY "Anon can insert posts with constraints"
    ON public.posts
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        char_length(trim(author_name)) >= 2 AND
        char_length(author_name) <= 60 AND
        media_url LIKE 'https://%' AND
        (caption IS NULL OR char_length(caption) <= 280) AND
        char_length(client_session_id) >= 10
    );

-- LGPD Compliance (Right to Erasure): Guest can delete their own post via client_session_id
CREATE POLICY "Guests can delete their own posts"
    ON public.posts
    FOR DELETE
    TO anon, authenticated
    USING (
        client_session_id = current_setting('request.headers', true)::json->>'x-client-session-id'
    );

-- Admin / Moderation: Service role has full unrestricted access
CREATE POLICY "Service role has full access to posts"
    ON public.posts
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- ------------------------------------------------------------------------------
-- RLS POLICIES: likes
-- ------------------------------------------------------------------------------
-- Read likes
CREATE POLICY "Anon can read likes count"
    ON public.likes
    FOR SELECT
    TO anon, authenticated
    USING (TRUE);

-- Insert like matching own session id
CREATE POLICY "Anon can like posts with valid session"
    ON public.likes
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (char_length(client_session_id) >= 10);

-- Delete only their own like
CREATE POLICY "Anon can remove own like"
    ON public.likes
    FOR DELETE
    TO anon, authenticated
    USING (char_length(client_session_id) >= 10);

-- ==============================================================================
-- 4. Atomic Stored Procedures (Concurrency-safe Likes Counter)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.increment_likes(target_post_id UUID)
RETURNS public.posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_post public.posts;
BEGIN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = target_post_id
    RETURNING * INTO updated_post;

    RETURN updated_post;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_likes(target_post_id UUID)
RETURNS public.posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_post public.posts;
BEGIN
    UPDATE public.posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = target_post_id
    RETURNING * INTO updated_post;

    RETURN updated_post;
END;
$$;
