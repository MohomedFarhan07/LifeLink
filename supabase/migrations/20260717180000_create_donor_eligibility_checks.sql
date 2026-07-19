CREATE TABLE IF NOT EXISTS public.donor_eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  has_diabetes boolean NOT NULL DEFAULT false,
  has_high_blood_pressure boolean NOT NULL DEFAULT false,
  has_high_cholesterol boolean NOT NULL DEFAULT false,
  has_recent_tattoo boolean NOT NULL DEFAULT false,
  tattoo_details text NOT NULL DEFAULT '',
  medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
  health_details text NOT NULL DEFAULT '',
  ai_eligible boolean NOT NULL,
  ai_reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donor_eligibility_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eligibility_checks_select_own" ON public.donor_eligibility_checks FOR SELECT TO authenticated USING (auth.uid() = donor_id);
CREATE POLICY "eligibility_checks_insert_own" ON public.donor_eligibility_checks FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_checks_donor_created ON public.donor_eligibility_checks(donor_id, created_at DESC);
