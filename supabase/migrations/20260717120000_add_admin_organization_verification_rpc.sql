-- Allows an authenticated administrator to update only organization verification status.
CREATE OR REPLACE FUNCTION public.update_organization_verification(
  organization_table text,
  organization_id uuid,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  IF new_status NOT IN ('pending', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification status';
  END IF;

  IF organization_table = 'hospitals' THEN
    UPDATE public.hospitals SET verification_status = new_status WHERE id = organization_id;
  ELSIF organization_table = 'blood_banks' THEN
    UPDATE public.blood_banks SET verification_status = new_status WHERE id = organization_id;
  ELSE
    RAISE EXCEPTION 'Invalid organization type';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization was not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_organization_verification(text, uuid, text) TO authenticated;
