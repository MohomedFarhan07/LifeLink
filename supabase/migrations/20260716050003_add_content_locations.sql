ALTER TABLE public.awareness
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

ALTER TABLE public.success_stories
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_awareness_location ON public.awareness(location);
CREATE INDEX IF NOT EXISTS idx_success_stories_location ON public.success_stories(location);
