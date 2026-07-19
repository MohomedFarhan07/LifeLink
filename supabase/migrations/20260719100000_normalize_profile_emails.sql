UPDATE public.profiles
SET email = lower(trim(email))
WHERE email <> lower(trim(email));
