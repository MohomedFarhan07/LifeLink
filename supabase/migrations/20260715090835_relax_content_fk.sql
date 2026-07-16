/*
# Relax FK constraints on public content author_id

## Purpose
Public content tables (awareness, success_stories, campaigns) currently require
author_id to reference profiles. To seed platform-default content without a real
author account, allow author_id to be nullable (platform content authored by the
system). Creators who are signed in still set author_id = auth.uid().

## Changes
- awareness.author_id: drop NOT NULL, drop FK to profiles (keep optional FK).
- success_stories.author_id: same.
- campaigns.organizer_id: keep FK but allow nullable for platform-seeded events.
*/

ALTER TABLE public.awareness ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.awareness DROP CONSTRAINT IF EXISTS awareness_author_id_fkey;
ALTER TABLE public.awareness ADD CONSTRAINT awareness_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.success_stories ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.success_stories DROP CONSTRAINT IF EXISTS success_stories_author_id_fkey;
ALTER TABLE public.success_stories ADD CONSTRAINT success_stories_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.campaigns ALTER COLUMN organizer_id DROP NOT NULL;
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_organizer_id_fkey;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_organizer_id_fkey
  FOREIGN KEY (organizer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
