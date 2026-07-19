-- Explicit cleanup for both self-service and administrator account deletion.
-- This covers content as well as operational records before auth.users is removed.
CREATE OR REPLACE FUNCTION public.purge_user_related_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.campaign_participants WHERE donor_id = target_user_id;
  DELETE FROM public.donor_dashboard_stats WHERE donor_id = target_user_id;
  DELETE FROM public.donor_eligibility_checks WHERE donor_id = target_user_id;
  DELETE FROM public.connection_messages WHERE sender_id = target_user_id OR recipient_id = target_user_id;
  DELETE FROM public.connections WHERE participant_one = target_user_id OR participant_two = target_user_id;
  DELETE FROM public.connection_requests WHERE requester_id = target_user_id OR recipient_id = target_user_id;
  DELETE FROM public.chat_messages WHERE sender_id = target_user_id OR recipient_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.donations WHERE donor_id = target_user_id OR hospital_id = target_user_id;
  DELETE FROM public.blood_requests WHERE hospital_id = target_user_id;
  DELETE FROM public.blood_transfers WHERE bank_id = target_user_id OR hospital_id = target_user_id;
  DELETE FROM public.blood_inventory WHERE bank_id = target_user_id;
  DELETE FROM public.awareness WHERE author_id = target_user_id;
  DELETE FROM public.success_stories WHERE author_id = target_user_id;
  DELETE FROM public.campaigns WHERE organizer_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM public.purge_user_related_data(auth.uid());
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_as_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_role text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access is required'; END IF;
  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User was not found'; END IF;
  IF target_role = 'admin' THEN RAISE EXCEPTION 'Administrator accounts cannot be deleted from the dashboard'; END IF;
  PERFORM public.purge_user_related_data(target_user_id);
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_as_admin(uuid) TO authenticated;
