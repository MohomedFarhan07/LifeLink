-- One ongoing conversation per relationship. Multiple accepted requests between
-- the same parties should use the existing connection rather than create a new chat.

WITH ranked_connections AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY kind, LEAST(participant_one, participant_two), GREATEST(participant_one, participant_two)
      ORDER BY created_at, id
    ) AS canonical_id
  FROM public.connections
)
UPDATE public.connection_messages AS message
SET connection_id = ranked_connections.canonical_id
FROM ranked_connections
WHERE message.connection_id = ranked_connections.id
  AND ranked_connections.id <> ranked_connections.canonical_id;

WITH ranked_connections AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY kind, LEAST(participant_one, participant_two), GREATEST(participant_one, participant_two)
      ORDER BY created_at, id
    ) AS canonical_id
  FROM public.connections
)
DELETE FROM public.connections AS connection
USING ranked_connections
WHERE connection.id = ranked_connections.id
  AND ranked_connections.id <> ranked_connections.canonical_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_relationship
  ON public.connections (kind, (LEAST(participant_one, participant_two)), (GREATEST(participant_one, participant_two)));

CREATE OR REPLACE FUNCTION public.create_connection_on_accept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.connections (request_id, kind, participant_one, participant_two)
    VALUES (NEW.id, NEW.kind, NEW.requester_id, NEW.recipient_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
