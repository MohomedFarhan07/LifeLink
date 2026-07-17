-- Correct installations that previously exposed entire profile and role tables
-- to anonymous users. Public visitors must use public.public_profiles only.
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "donors_select_all" ON public.donors;
CREATE POLICY "donors_select_all" ON public.donors FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "hospitals_select_all" ON public.hospitals;
CREATE POLICY "hospitals_select_all" ON public.hospitals FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "blood_banks_select_all" ON public.blood_banks;
CREATE POLICY "blood_banks_select_all" ON public.blood_banks FOR SELECT
TO authenticated USING (true);

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT p.id, p.role, p.full_name AS display_name, p.city, p.avatar_url,
       d.blood_group, d.availability_status,
       NULL::text AS organization_name, NULL::text AS organization_type,
       NULL::text AS location, NULL::text AS verification_status
FROM public.profiles p JOIN public.donors d ON d.user_id = p.id
WHERE p.role = 'donor'
UNION ALL
SELECT p.id, p.role, h.hospital_name, p.city, p.avatar_url,
       NULL::text, NULL::text, h.hospital_name, h.hospital_type,
       h.location, h.verification_status
FROM public.profiles p JOIN public.hospitals h ON h.user_id = p.id
WHERE p.role = 'hospital'
UNION ALL
SELECT p.id, p.role, b.bank_name, p.city, p.avatar_url,
       NULL::text, NULL::text, b.bank_name, NULL::text,
       b.location, b.verification_status
FROM public.profiles p JOIN public.blood_banks b ON b.user_id = p.id
WHERE p.role = 'blood_bank';

GRANT SELECT ON public.public_profiles TO anon, authenticated;
