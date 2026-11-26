-- hidden_from_projector becomes the choice of the moderators about the
-- projector: true takes the post off, false shows it even with a banned
-- term, NULL leaves it to the banned terms.
BEGIN;

ALTER TABLE public.posts ALTER COLUMN hidden_from_projector DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN hidden_from_projector DROP DEFAULT;
-- Until now false only meant that no moderator had taken the post off
UPDATE public.posts SET hidden_from_projector = NULL WHERE hidden_from_projector = false;

COMMIT;
