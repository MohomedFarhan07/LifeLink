-- Public visitors may see aggregate platform impact, but never individual records.
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (donors bigint, hospitals bigint, lives_saved bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles WHERE role = 'donor'),
    (SELECT count(*) FROM public.profiles WHERE role = 'hospital'),
    (SELECT count(*) * 3 FROM public.donations WHERE status = 'completed');
$$;

REVOKE ALL ON FUNCTION public.get_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
