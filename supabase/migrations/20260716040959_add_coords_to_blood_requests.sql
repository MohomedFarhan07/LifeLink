/*
# Add latitude/longitude columns to blood_requests

## Purpose
The hospital dashboard's "Create & Match Donors" flow inserts `latitude` and
`longitude` into blood_requests, but those columns don't exist — causing a
PGRST204 error ("Could not find the 'latitude' column") and aborting the
request creation + donor matching.

## Changes
- blood_requests: add nullable `latitude` and `longitude` double precision
  columns for geographic donor matching.

## Security
- No RLS changes. Existing policies still apply.
*/

ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS idx_blood_requests_location
  ON public.blood_requests(latitude, longitude);
