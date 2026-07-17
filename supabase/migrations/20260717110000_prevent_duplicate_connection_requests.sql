-- Keep one active request per requester, recipient, and connection type.
WITH ranked_requests AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY kind, requester_id, recipient_id
      ORDER BY created_at DESC, id DESC
    ) AS position
  FROM public.connection_requests
  WHERE status = 'pending'
)
UPDATE public.connection_requests AS request
SET status = 'cancelled', updated_at = now()
FROM ranked_requests
WHERE request.id = ranked_requests.id
  AND ranked_requests.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_requests_one_pending_per_pair
  ON public.connection_requests (kind, requester_id, recipient_id)
  WHERE status = 'pending';
