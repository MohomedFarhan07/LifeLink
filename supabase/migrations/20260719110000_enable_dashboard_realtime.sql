DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_requests; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.donations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_inventory; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blood_transfers; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.blood_requests REPLICA IDENTITY FULL;
ALTER TABLE public.donations REPLICA IDENTITY FULL;
ALTER TABLE public.blood_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.blood_transfers REPLICA IDENTITY FULL;
