ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Sri Lanka',
  ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS postal_code text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_profiles_country_district ON public.profiles(country, district);
