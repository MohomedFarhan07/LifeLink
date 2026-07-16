/*
# Hospital Analytics — Organ Requests & Blood Usage Tracking

## Purpose
Add two new tables to store hospital-specific analytics data:
1. `organ_requests` — tracks organ transplant requests made by hospitals
2. `blood_usage` — logs blood units consumed/used per department for usage analytics

## Tables Created

### organ_requests
- `id` (uuid, primary key)
- `hospital_id` (uuid, references profiles.id, defaults to auth.uid())
- `organ_needed` (text, not null) — e.g. kidney, liver, heart, lung, pancreas, cornea, intestine
- `blood_group` (text, check constraint for valid blood groups)
- `patient_urgency` (text: critical/high/normal, default normal)
- `recipient_age` (int)
- `recipient_blood_group` (text, check constraint for valid blood groups)
- `status` (text: open/matched/transplanted/expired/cancelled, default open)
- `notes` (text)
- `created_at`, `updated_at` (timestamptz)

### blood_usage
- `id` (uuid, primary key)
- `hospital_id` (uuid, references profiles.id, defaults to auth.uid())
- `blood_group` (text, check constraint for valid blood groups)
- `units_used` (int, not null, default 1)
- `department` (text, not null) — e.g. ER, ICU, Surgery, Oncology, Maternity
- `usage_type` (text: transfusion/surgery/emergency/research, default transfusion)
- `usage_date` (date, default current date)
- `patient_outcome` (text: stable/recovered/critical/deceased, default stable)
- `notes` (text)
- `created_at`, `updated_at` (timestamptz)

## Security (RLS)
- organ_requests: hospital owner can CRUD own rows; authenticated users can SELECT all
  (organ matching may need cross-hospital visibility).
- blood_usage: hospital owner can CRUD own rows; authenticated users can SELECT all
  (analytics aggregation needs read access).

## Notes
- Both tables have hospital_id defaulting to auth.uid() so inserts from the
  hospital client succeed without explicitly passing the owner id.
- Indexes added on hospital_id and status for query performance.
- updated_at trigger applied via the existing handle_updated_at() function.
*/

-- =============================================================
-- organ_requests
-- =============================================================
CREATE TABLE IF NOT EXISTS public.organ_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  organ_needed text NOT NULL CHECK (organ_needed IN ('kidney','liver','heart','lung','pancreas','cornea','intestine','heart_lung','kidney_pancreas')),
  blood_group text CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  patient_urgency text NOT NULL CHECK (patient_urgency IN ('critical','high','normal')) DEFAULT 'normal',
  recipient_age int,
  recipient_blood_group text CHECK (recipient_blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  status text CHECK (status IN ('open','matched','transplanted','expired','cancelled')) DEFAULT 'open',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organ_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organ_requests_select_authed" ON public.organ_requests;
CREATE POLICY "organ_requests_select_authed"
ON public.organ_requests FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "organ_requests_insert_hospital" ON public.organ_requests;
CREATE POLICY "organ_requests_insert_hospital"
ON public.organ_requests FOR INSERT
TO authenticated WITH CHECK (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "organ_requests_update_hospital" ON public.organ_requests;
CREATE POLICY "organ_requests_update_hospital"
ON public.organ_requests FOR UPDATE
TO authenticated USING (auth.uid() = hospital_id) WITH CHECK (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "organ_requests_delete_hospital" ON public.organ_requests;
CREATE POLICY "organ_requests_delete_hospital"
ON public.organ_requests FOR DELETE
TO authenticated USING (auth.uid() = hospital_id);

-- =============================================================
-- blood_usage
-- =============================================================
CREATE TABLE IF NOT EXISTS public.blood_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_used int NOT NULL DEFAULT 1,
  department text NOT NULL,
  usage_type text CHECK (usage_type IN ('transfusion','surgery','emergency','research')) DEFAULT 'transfusion',
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  patient_outcome text CHECK (patient_outcome IN ('stable','recovered','critical','deceased')) DEFAULT 'stable',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blood_usage_select_authed" ON public.blood_usage;
CREATE POLICY "blood_usage_select_authed"
ON public.blood_usage FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "blood_usage_insert_hospital" ON public.blood_usage;
CREATE POLICY "blood_usage_insert_hospital"
ON public.blood_usage FOR INSERT
TO authenticated WITH CHECK (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "blood_usage_update_hospital" ON public.blood_usage;
CREATE POLICY "blood_usage_update_hospital"
ON public.blood_usage FOR UPDATE
TO authenticated USING (auth.uid() = hospital_id) WITH CHECK (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "blood_usage_delete_hospital" ON public.blood_usage;
CREATE POLICY "blood_usage_delete_hospital"
ON public.blood_usage FOR DELETE
TO authenticated USING (auth.uid() = hospital_id);

-- =============================================================
-- Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_organ_requests_hospital ON public.organ_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_organ_requests_status ON public.organ_requests(status);
CREATE INDEX IF NOT EXISTS idx_organ_requests_organ ON public.organ_requests(organ_needed);
CREATE INDEX IF NOT EXISTS idx_blood_usage_hospital ON public.blood_usage(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_usage_date ON public.blood_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_blood_usage_department ON public.blood_usage(department);

-- =============================================================
-- updated_at triggers
-- =============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['organ_requests','blood_usage'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
  END LOOP;
END $$;
