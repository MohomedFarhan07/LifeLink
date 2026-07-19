CREATE TABLE IF NOT EXISTS public.donor_dashboard_stats (
  donor_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  donations_completed integer NOT NULL DEFAULT 0 CHECK (donations_completed >= 0),
  lives_impacted integer NOT NULL DEFAULT 0 CHECK (lives_impacted >= 0),
  active_requests integer NOT NULL DEFAULT 0 CHECK (active_requests >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donor_dashboard_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donor_dashboard_stats_select_own"
ON public.donor_dashboard_stats FOR SELECT TO authenticated
USING (auth.uid() = donor_id);

CREATE POLICY "donor_dashboard_stats_insert_own"
ON public.donor_dashboard_stats FOR INSERT TO authenticated
WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "donor_dashboard_stats_update_own"
ON public.donor_dashboard_stats FOR UPDATE TO authenticated
USING (auth.uid() = donor_id)
WITH CHECK (auth.uid() = donor_id);
