/*
# Create delete_user_account function

## Purpose
Enables authenticated users to delete their own accounts from the database.
Deleting from auth.users cascades to public.profiles and all referencing stakeholder tables.

## Security
Only allows users to delete their own account (where id = auth.uid()).
Executes as SECURITY DEFINER so that it bypasses standard client permission restrictions on auth.users.
*/

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
