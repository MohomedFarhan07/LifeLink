/*
  Remove the Volunteer / NGO role and transfer publishing privileges:
  - Blood banks: awareness articles, success stories, and campaigns.
  - Hospitals: success stories only.
  - Administrators retain moderation access.
*/

-- Remove existing volunteer profiles and their role-specific records.
DELETE FROM public.profiles WHERE role = 'volunteer';
DROP TABLE IF EXISTS public.volunteers;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('donor', 'hospital', 'blood_bank', 'admin'));

-- Awareness: Blood Banks and admins only.
DROP POLICY IF EXISTS "awareness_insert_authed" ON public.awareness;
DROP POLICY IF EXISTS "awareness_update_own_admin" ON public.awareness;
DROP POLICY IF EXISTS "awareness_delete_own_admin" ON public.awareness;
CREATE POLICY "awareness_insert_blood_bank"
ON public.awareness FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')));
CREATE POLICY "awareness_update_blood_bank"
ON public.awareness FOR UPDATE TO authenticated
USING ((auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')) OR public.is_admin())
WITH CHECK ((auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')) OR public.is_admin());
CREATE POLICY "awareness_delete_blood_bank"
ON public.awareness FOR DELETE TO authenticated
USING ((auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')) OR public.is_admin());

-- Success stories: Hospitals, Blood Banks, and admins.
DROP POLICY IF EXISTS "stories_insert_authed" ON public.success_stories;
DROP POLICY IF EXISTS "stories_update_own_admin" ON public.success_stories;
DROP POLICY IF EXISTS "stories_delete_own_admin" ON public.success_stories;
CREATE POLICY "stories_insert_hospital_or_bank"
ON public.success_stories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hospital', 'blood_bank'))));
CREATE POLICY "stories_update_hospital_or_bank"
ON public.success_stories FOR UPDATE TO authenticated
USING ((auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hospital', 'blood_bank'))) OR public.is_admin())
WITH CHECK ((auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hospital', 'blood_bank'))) OR public.is_admin());
CREATE POLICY "stories_delete_hospital_or_bank"
ON public.success_stories FOR DELETE TO authenticated
USING ((auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hospital', 'blood_bank'))) OR public.is_admin());

-- Campaigns: Blood Banks and admins only.
DROP POLICY IF EXISTS "campaigns_insert_authed" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
CREATE POLICY "campaigns_insert_blood_bank"
ON public.campaigns FOR INSERT TO authenticated
WITH CHECK (auth.uid() = organizer_id AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')));
CREATE POLICY "campaigns_update_blood_bank"
ON public.campaigns FOR UPDATE TO authenticated
USING ((auth.uid() = organizer_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')) OR public.is_admin())
WITH CHECK ((auth.uid() = organizer_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')) OR public.is_admin());
CREATE POLICY "campaigns_delete_blood_bank"
ON public.campaigns FOR DELETE TO authenticated
USING ((auth.uid() = organizer_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'blood_bank')) OR public.is_admin());
