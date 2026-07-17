-- Approved connection workflow: Blood Bank <-> Donor and Hospital <-> Blood Bank.
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('bank_donor', 'hospital_bank')),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units int NOT NULL DEFAULT 1 CHECK (units > 0),
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> recipient_id)
);

CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.connection_requests(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('bank_donor', 'hospital_bank')),
  participant_one uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_two uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (participant_one <> participant_two)
);

CREATE TABLE IF NOT EXISTS public.connection_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','cancelled','attended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, donor_id)
);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connection_requests_select_parties" ON public.connection_requests;
DROP POLICY IF EXISTS "connection_requests_insert_requester" ON public.connection_requests;
DROP POLICY IF EXISTS "connection_requests_update_recipient" ON public.connection_requests;
DROP POLICY IF EXISTS "connections_select_parties" ON public.connections;
DROP POLICY IF EXISTS "connection_messages_select_parties" ON public.connection_messages;
DROP POLICY IF EXISTS "connection_messages_insert_sender" ON public.connection_messages;
DROP POLICY IF EXISTS "connection_messages_update_recipient" ON public.connection_messages;
DROP POLICY IF EXISTS "campaign_participants_select" ON public.campaign_participants;
DROP POLICY IF EXISTS "campaign_participants_insert_donor" ON public.campaign_participants;
DROP POLICY IF EXISTS "campaign_participants_update_donor" ON public.campaign_participants;

CREATE POLICY "connection_requests_select_parties" ON public.connection_requests FOR SELECT TO authenticated USING (auth.uid() IN (requester_id, recipient_id));
CREATE POLICY "connection_requests_insert_requester" ON public.connection_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "connection_requests_update_recipient" ON public.connection_requests FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "connections_select_parties" ON public.connections FOR SELECT TO authenticated USING (auth.uid() IN (participant_one, participant_two));
CREATE POLICY "connection_messages_select_parties" ON public.connection_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.connections c WHERE c.id = connection_id AND auth.uid() IN (c.participant_one, c.participant_two)));
CREATE POLICY "connection_messages_insert_sender" ON public.connection_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.connections c WHERE c.id = connection_id AND sender_id IN (c.participant_one, c.participant_two) AND recipient_id IN (c.participant_one, c.participant_two))
);
CREATE POLICY "connection_messages_update_recipient" ON public.connection_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "campaign_participants_select" ON public.campaign_participants FOR SELECT TO authenticated USING (
  auth.uid() = donor_id OR EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.organizer_id = auth.uid())
);
CREATE POLICY "campaign_participants_insert_donor" ON public.campaign_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "campaign_participants_update_donor" ON public.campaign_participants FOR UPDATE TO authenticated USING (auth.uid() = donor_id) WITH CHECK (auth.uid() = donor_id);

CREATE OR REPLACE FUNCTION public.create_connection_on_accept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.connections (request_id, kind, participant_one, participant_two)
    VALUES (NEW.id, NEW.kind, NEW.requester_id, NEW.recipient_id)
    ON CONFLICT (request_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_connection_on_request_accept ON public.connection_requests;
CREATE TRIGGER create_connection_on_request_accept AFTER UPDATE ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION public.create_connection_on_accept();

CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient ON public.connection_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_participants ON public.connections(participant_one, participant_two);
CREATE INDEX IF NOT EXISTS idx_connection_messages_connection ON public.connection_messages(connection_id, created_at);

ALTER TABLE public.connection_requests REPLICA IDENTITY FULL;
ALTER TABLE public.connections REPLICA IDENTITY FULL;
ALTER TABLE public.connection_messages REPLICA IDENTITY FULL;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.connections; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
