/*
# LifeLink — Blood & Organ Donation Management Platform Schema

## Purpose
Create the full data model for a multi-role platform coordinating blood and organ
donations across donors, hospitals, blood banks, volunteers/NGOs, and admins.

## Tables Created
1. profiles — extends auth.users with role + shared display fields (one row per user).
2. donors — donor-specific health & contact metadata (linked to profiles.id).
3. hospitals — hospital registration & verification details (linked to profiles.id).
4. blood_banks — blood bank registration & verification details (linked to profiles.id).
5. volunteers — volunteer/NGO organization details (linked to profiles.id).
6. blood_requests — emergency blood requests created by hospitals.
7. donations — records of accepted donation requests / completed donations.
8. blood_inventory — blood bank stock units with expiry tracking.
9. blood_transfers — transfers from blood bank to hospital (approval workflow).
10. awareness — public awareness articles/programs (by volunteers/admins).
11. success_stories — public success story posts (by volunteers/admins).
12. campaigns — donation drive campaigns run by volunteers.
13. faqs — public frequently asked questions (managed by admins).
14. notifications — in-app notifications to users (donors, hospitals, etc.).

## Security (RLS)
- profiles: authenticated users can read all profiles (needed for matching),
  update only their own; insert own row at signup.
- donors/hospitals/blood_banks/volunteers: owner can CRUD own row; authenticated
  users can SELECT (hospitals/blood banks visible for matching/search).
- blood_requests: hospitals CRUD own; all authenticated can SELECT.
- donations: donor + hospital involved can SELECT; donors update status of own.
- blood_inventory: blood bank owner CRUD; authenticated can SELECT.
- blood_transfers: bank + hospital parties CRUD; admin can access.
- awareness / success_stories / campaigns / faqs: public SELECT (anon+authenticated);
  authenticated creators can INSERT/UPDATE/DELETE own.
- notifications: each authenticated user can SELECT/UPDATE/DELETE their own.

## Notes
- Owner columns default to auth.uid() where the row is created by the signed-in user.
- Admin role is designated via profiles.role = 'admin'. A helper RPC `is_admin()`
  is provided for policy predicates checking admin status.
*/

-- =============================================================
-- 1. profiles  (created first so is_admin() can reference it)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('donor','hospital','blood_bank','volunteer','admin')),
  phone text DEFAULT '',
  country text DEFAULT 'Sri Lanka',
  district text DEFAULT '',
  postal_code text DEFAULT '',
  avatar_url text DEFAULT '',
  city text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Helper function to check if current user is an admin (after profiles exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================================
-- 2. donors
-- =============================================================
CREATE TABLE IF NOT EXISTS public.donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  nic_number text DEFAULT '',
  date_of_birth date,
  gender text CHECK (gender IN ('male','female','other')) DEFAULT 'male',
  blood_group text CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')) DEFAULT 'O+',
  emergency_contact text DEFAULT '',
  medical_history text DEFAULT '',
  last_donation_date date,
  organ_donation_preference boolean DEFAULT false,
  availability_status text CHECK (availability_status IN ('available','unavailable','temporarily_unavailable')) DEFAULT 'available',
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donors_select_all" ON public.donors;
CREATE POLICY "donors_select_all"
ON public.donors FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "donors_insert_own" ON public.donors;
CREATE POLICY "donors_insert_own"
ON public.donors FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "donors_update_own" ON public.donors;
CREATE POLICY "donors_update_own"
ON public.donors FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "donors_delete_own" ON public.donors;
CREATE POLICY "donors_delete_own"
ON public.donors FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- =============================================================
-- 3. hospitals
-- =============================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_name text NOT NULL DEFAULT '',
  registration_number text DEFAULT '',
  hospital_type text CHECK (hospital_type IN ('public','private','teaching','specialist','clinic')) DEFAULT 'public',
  contact_number text DEFAULT '',
  location text DEFAULT '',
  latitude double precision,
  longitude double precision,
  verification_status text CHECK (verification_status IN ('pending','verified','rejected')) DEFAULT 'pending',
  verification_documents text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hospitals_select_all" ON public.hospitals;
CREATE POLICY "hospitals_select_all"
ON public.hospitals FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "hospitals_insert_own" ON public.hospitals;
CREATE POLICY "hospitals_insert_own"
ON public.hospitals FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hospitals_update_own" ON public.hospitals;
CREATE POLICY "hospitals_update_own"
ON public.hospitals FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hospitals_delete_own" ON public.hospitals;
CREATE POLICY "hospitals_delete_own"
ON public.hospitals FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- =============================================================
-- 4. blood_banks
-- =============================================================
CREATE TABLE IF NOT EXISTS public.blood_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_name text NOT NULL DEFAULT '',
  license_number text DEFAULT '',
  contact_number text DEFAULT '',
  location text DEFAULT '',
  latitude double precision,
  longitude double precision,
  verification_status text CHECK (verification_status IN ('pending','verified','rejected')) DEFAULT 'pending',
  verification_documents text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blood_banks_select_all" ON public.blood_banks;
CREATE POLICY "blood_banks_select_all"
ON public.blood_banks FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "blood_banks_insert_own" ON public.blood_banks;
CREATE POLICY "blood_banks_insert_own"
ON public.blood_banks FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blood_banks_update_own" ON public.blood_banks;
CREATE POLICY "blood_banks_update_own"
ON public.blood_banks FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blood_banks_delete_own" ON public.blood_banks;
CREATE POLICY "blood_banks_delete_own"
ON public.blood_banks FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- =============================================================
-- 5. volunteers
-- =============================================================
CREATE TABLE IF NOT EXISTS public.volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_name text NOT NULL DEFAULT '',
  ngo_registration_number text DEFAULT '',
  contact_number text DEFAULT '',
  location text DEFAULT '',
  verification_status text CHECK (verification_status IN ('pending','verified','rejected')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "volunteers_select_all" ON public.volunteers;
CREATE POLICY "volunteers_select_all"
ON public.volunteers FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "volunteers_insert_own" ON public.volunteers;
CREATE POLICY "volunteers_insert_own"
ON public.volunteers FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "volunteers_update_own" ON public.volunteers;
CREATE POLICY "volunteers_update_own"
ON public.volunteers FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "volunteers_delete_own" ON public.volunteers;
CREATE POLICY "volunteers_delete_own"
ON public.volunteers FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- =============================================================
-- 6. blood_requests
-- =============================================================
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_name text DEFAULT '',
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  quantity_units int NOT NULL DEFAULT 1,
  patient_urgency text NOT NULL CHECK (patient_urgency IN ('critical','high','normal')) DEFAULT 'normal',
  location text DEFAULT '',
  required_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  status text CHECK (status IN ('open','matched','fulfilled','expired','cancelled')) DEFAULT 'open',
  ai_priority_score int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select_authed" ON public.blood_requests;
CREATE POLICY "requests_select_authed"
ON public.blood_requests FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "requests_insert_hospital" ON public.blood_requests;
CREATE POLICY "requests_insert_hospital"
ON public.blood_requests FOR INSERT
TO authenticated WITH CHECK (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "requests_update_owner_admin" ON public.blood_requests;
CREATE POLICY "requests_update_owner_admin"
ON public.blood_requests FOR UPDATE
TO authenticated USING (auth.uid() = hospital_id OR public.is_admin()) WITH CHECK (auth.uid() = hospital_id OR public.is_admin());

DROP POLICY IF EXISTS "requests_delete_owner_admin" ON public.blood_requests;
CREATE POLICY "requests_delete_owner_admin"
ON public.blood_requests FOR DELETE
TO authenticated USING (auth.uid() = hospital_id OR public.is_admin());

-- =============================================================
-- 7. donations
-- =============================================================
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  donor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  donation_date date NOT NULL DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('pending','accepted','rejected','completed','cancelled')) DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donations_select_parties" ON public.donations;
CREATE POLICY "donations_select_parties"
ON public.donations FOR SELECT
TO authenticated USING (auth.uid() = donor_id OR auth.uid() = hospital_id OR public.is_admin());

DROP POLICY IF EXISTS "donations_insert_hospital" ON public.donations;
CREATE POLICY "donations_insert_hospital"
ON public.donations FOR INSERT
TO authenticated WITH CHECK (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "donations_update_parties" ON public.donations;
CREATE POLICY "donations_update_parties"
ON public.donations FOR UPDATE
TO authenticated USING (auth.uid() = donor_id OR auth.uid() = hospital_id OR public.is_admin()) WITH CHECK (auth.uid() = donor_id OR auth.uid() = hospital_id OR public.is_admin());

DROP POLICY IF EXISTS "donations_delete_hospital" ON public.donations;
CREATE POLICY "donations_delete_hospital"
ON public.donations FOR DELETE
TO authenticated USING (auth.uid() = hospital_id OR public.is_admin());

-- =============================================================
-- 8. blood_inventory
-- =============================================================
CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_name text DEFAULT '',
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units int NOT NULL DEFAULT 0,
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL DEFAULT (CURRENT_DATE + 42),
  status text CHECK (status IN ('available','reserved','expired','depleted')) DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select_authed" ON public.blood_inventory;
CREATE POLICY "inventory_select_authed"
ON public.blood_inventory FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_insert_bank" ON public.blood_inventory;
CREATE POLICY "inventory_insert_bank"
ON public.blood_inventory FOR INSERT
TO authenticated WITH CHECK (auth.uid() = bank_id);

DROP POLICY IF EXISTS "inventory_update_bank" ON public.blood_inventory;
CREATE POLICY "inventory_update_bank"
ON public.blood_inventory FOR UPDATE
TO authenticated USING (auth.uid() = bank_id) WITH CHECK (auth.uid() = bank_id);

DROP POLICY IF EXISTS "inventory_delete_bank" ON public.blood_inventory;
CREATE POLICY "inventory_delete_bank"
ON public.blood_inventory FOR DELETE
TO authenticated USING (auth.uid() = bank_id);

-- =============================================================
-- 9. blood_transfers
-- =============================================================
CREATE TABLE IF NOT EXISTS public.blood_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.blood_inventory(id) ON DELETE CASCADE,
  bank_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units int NOT NULL DEFAULT 1,
  status text CHECK (status IN ('requested','approved','rejected','dispatched','completed')) DEFAULT 'requested',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfers_select_parties" ON public.blood_transfers;
CREATE POLICY "transfers_select_parties"
ON public.blood_transfers FOR SELECT
TO authenticated USING (auth.uid() = bank_id OR auth.uid() = hospital_id OR public.is_admin());

DROP POLICY IF EXISTS "transfers_insert_hospital" ON public.blood_transfers;
CREATE POLICY "transfers_insert_hospital"
ON public.blood_transfers FOR INSERT
TO authenticated WITH CHECK (auth.uid() = hospital_id);

DROP POLICY IF EXISTS "transfers_update_bank_hospital" ON public.blood_transfers;
CREATE POLICY "transfers_update_bank_hospital"
ON public.blood_transfers FOR UPDATE
TO authenticated USING (auth.uid() = bank_id OR auth.uid() = hospital_id OR public.is_admin()) WITH CHECK (auth.uid() = bank_id OR auth.uid() = hospital_id OR public.is_admin());

DROP POLICY IF EXISTS "transfers_delete_bank" ON public.blood_transfers;
CREATE POLICY "transfers_delete_bank"
ON public.blood_transfers FOR DELETE
TO authenticated USING (auth.uid() = bank_id OR public.is_admin());

-- =============================================================
-- 10. awareness
-- =============================================================
CREATE TABLE IF NOT EXISTS public.awareness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  content text DEFAULT '',
  category text DEFAULT 'general',
  image_url text DEFAULT '',
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.awareness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "awareness_select_public" ON public.awareness;
CREATE POLICY "awareness_select_public"
ON public.awareness FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "awareness_insert_authed" ON public.awareness;
CREATE POLICY "awareness_insert_authed"
ON public.awareness FOR INSERT
TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "awareness_update_own_admin" ON public.awareness;
CREATE POLICY "awareness_update_own_admin"
ON public.awareness FOR UPDATE
TO authenticated USING (auth.uid() = author_id OR public.is_admin()) WITH CHECK (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "awareness_delete_own_admin" ON public.awareness;
CREATE POLICY "awareness_delete_own_admin"
ON public.awareness FOR DELETE
TO authenticated USING (auth.uid() = author_id OR public.is_admin());

-- =============================================================
-- 11. success_stories
-- =============================================================
CREATE TABLE IF NOT EXISTS public.success_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  recipient_name text DEFAULT '',
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text DEFAULT '',
  story_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_select_public" ON public.success_stories;
CREATE POLICY "stories_select_public"
ON public.success_stories FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "stories_insert_authed" ON public.success_stories;
CREATE POLICY "stories_insert_authed"
ON public.success_stories FOR INSERT
TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "stories_update_own_admin" ON public.success_stories;
CREATE POLICY "stories_update_own_admin"
ON public.success_stories FOR UPDATE
TO authenticated USING (auth.uid() = author_id OR public.is_admin()) WITH CHECK (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "stories_delete_own_admin" ON public.success_stories;
CREATE POLICY "stories_delete_own_admin"
ON public.success_stories FOR DELETE
TO authenticated USING (auth.uid() = author_id OR public.is_admin());

-- =============================================================
-- 12. campaigns
-- =============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  location text DEFAULT '',
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  organizer_name text DEFAULT '',
  participants_count int DEFAULT 0,
  goal_units int DEFAULT 0,
  status text CHECK (status IN ('upcoming','active','completed','cancelled')) DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_public" ON public.campaigns;
CREATE POLICY "campaigns_select_public"
ON public.campaigns FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "campaigns_insert_authed" ON public.campaigns;
CREATE POLICY "campaigns_insert_authed"
ON public.campaigns FOR INSERT
TO authenticated WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
CREATE POLICY "campaigns_update_own"
ON public.campaigns FOR UPDATE
TO authenticated USING (auth.uid() = organizer_id OR public.is_admin()) WITH CHECK (auth.uid() = organizer_id OR public.is_admin());

DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
CREATE POLICY "campaigns_delete_own"
ON public.campaigns FOR DELETE
TO authenticated USING (auth.uid() = organizer_id OR public.is_admin());

-- =============================================================
-- 13. faqs
-- =============================================================
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  display_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faqs_select_public" ON public.faqs;
CREATE POLICY "faqs_select_public"
ON public.faqs FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "faqs_insert_admin" ON public.faqs;
CREATE POLICY "faqs_insert_admin"
ON public.faqs FOR INSERT
TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "faqs_update_admin" ON public.faqs;
CREATE POLICY "faqs_update_admin"
ON public.faqs FOR UPDATE
TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "faqs_delete_admin" ON public.faqs;
CREATE POLICY "faqs_delete_admin"
ON public.faqs FOR DELETE
TO authenticated USING (public.is_admin());

-- =============================================================
-- 14. notifications
-- =============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text DEFAULT '',
  link text DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own"
ON public.notifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_own" ON public.notifications;
CREATE POLICY "notif_insert_own"
ON public.notifications FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own"
ON public.notifications FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete_own" ON public.notifications;
CREATE POLICY "notif_delete_own"
ON public.notifications FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- =============================================================
-- Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_donors_user_id ON public.donors(user_id);
CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON public.donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON public.hospitals(user_id);
CREATE INDEX IF NOT EXISTS idx_blood_banks_user_id ON public.blood_banks(user_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital ON public.blood_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_hospital ON public.donations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inventory_bank ON public.blood_inventory(bank_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_awareness_category ON public.awareness(category);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =============================================================
-- updated_at trigger function (reusable)
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','donors','hospitals','blood_banks','volunteers','blood_requests','donations','blood_inventory','blood_transfers','awareness','success_stories','campaigns','faqs','notifications'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
  END LOOP;
END $$;
