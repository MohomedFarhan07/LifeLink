-- Public profile data is exposed through a deliberately limited view below.
-- Never make the source tables public: they contain private contact, identity,
-- medical, registration, and verification-document data.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT p.id, p.role, p.full_name AS display_name, p.city, p.avatar_url,
       d.blood_group, d.availability_status,
       NULL::text AS organization_name, NULL::text AS organization_type,
       NULL::text AS location, NULL::text AS verification_status
FROM public.profiles p
JOIN public.donors d ON d.user_id = p.id
WHERE p.role = 'donor'
UNION ALL
SELECT p.id, p.role, h.hospital_name, p.city, p.avatar_url,
       NULL::text, NULL::text, h.hospital_name, h.hospital_type,
       h.location, h.verification_status
FROM public.profiles p
JOIN public.hospitals h ON h.user_id = p.id
WHERE p.role = 'hospital'
UNION ALL
SELECT p.id, p.role, b.bank_name, p.city, p.avatar_url,
       NULL::text, NULL::text, b.bank_name, NULL::text,
       b.location, b.verification_status
FROM public.profiles p
JOIN public.blood_banks b ON b.user_id = p.id
WHERE p.role = 'blood_bank';

GRANT SELECT ON public.public_profiles TO anon, authenticated;
