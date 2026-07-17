-- Permanently delete a non-admin account and all records that reference it.
CREATE OR REPLACE FUNCTION public.delete_user_as_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_role text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User was not found';
  END IF;
  IF target_role = 'admin' THEN
    RAISE EXCEPTION 'Administrator accounts cannot be deleted from the dashboard';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_as_admin(uuid) TO authenticated;
