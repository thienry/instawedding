-- The baseline seeds ids 1 to 5 explicitly without advancing the sequence,
-- so creating a challenge failed with a duplicate key.
SELECT setval(
  pg_get_serial_sequence('public.challenges', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM public.challenges), 1)
);
