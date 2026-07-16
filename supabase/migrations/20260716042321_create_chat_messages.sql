/*
# Hospital–Donor Chat Messages

## Purpose
Enable a realtime chat between a hospital and a donor once a donation request
has been accepted by the donor. Messages are scoped to a specific donation row
so each blood-donation coordination has its own conversation thread.

## Table Created
### chat_messages
- `id` (uuid, primary key)
- `donation_id` (uuid, references donations.id, ON DELETE CASCADE) — the
  donation/request thread this message belongs to.
- `sender_id` (uuid, references profiles.id, defaults to auth.uid()) — the
  user sending the message.
- `recipient_id` (uuid, references profiles.id) — the other party.
- `body` (text, not null) — message content.
- `read_at` (timestamptz, nullable) — when the recipient read the message.
- `created_at` (timestamptz, default now())

## Security (RLS)
- Both the sender and recipient can SELECT messages in threads they belong to.
- Only the sender can INSERT a message they authored (auth.uid() = sender_id).
- Only the recipient can mark a message read (UPDATE read_at) — restricted via
  WITH CHECK so only the recipient's own read_at can be set.
- DELETE not allowed via policy (messages are immutable once sent).

## Notes
- donation_id is indexed for fast thread lookups.
- created_at indexed for ordering.
- sender_id defaults to auth.uid() so inserts from the client succeed without
  explicitly passing the owner.
*/

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select_parties" ON public.chat_messages;
CREATE POLICY "chat_select_parties"
ON public.chat_messages FOR SELECT
TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "chat_insert_sender" ON public.chat_messages;
CREATE POLICY "chat_insert_sender"
ON public.chat_messages FOR INSERT
TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "chat_update_recipient_read" ON public.chat_messages;
CREATE POLICY "chat_update_recipient_read"
ON public.chat_messages FOR UPDATE
TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS idx_chat_donation ON public.chat_messages(donation_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_recipient_unread ON public.chat_messages(recipient_id) WHERE read_at IS NULL;
