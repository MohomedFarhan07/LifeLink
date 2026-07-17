-- Approve a hospital transfer and reserve inventory in one transaction.
CREATE OR REPLACE FUNCTION public.approve_blood_transfer(transfer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transfer_row public.blood_transfers%ROWTYPE;
  inventory_units integer;
  inventory_status text;
BEGIN
  SELECT * INTO transfer_row
  FROM public.blood_transfers
  WHERE id = transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer request was not found';
  END IF;
  IF transfer_row.bank_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the receiving blood bank can approve this request';
  END IF;
  IF transfer_row.status <> 'requested' THEN
    RAISE EXCEPTION 'This transfer request has already been processed';
  END IF;

  SELECT units, status INTO inventory_units, inventory_status
  FROM public.blood_inventory
  WHERE id = transfer_row.inventory_id
  FOR UPDATE;

  IF NOT FOUND OR inventory_status <> 'available' OR inventory_units < transfer_row.units THEN
    RAISE EXCEPTION 'This inventory unit no longer has enough available blood';
  END IF;

  UPDATE public.blood_inventory
  SET units = inventory_units - transfer_row.units,
      status = CASE WHEN inventory_units - transfer_row.units = 0 THEN 'depleted' ELSE 'available' END,
      updated_at = now()
  WHERE id = transfer_row.inventory_id;

  UPDATE public.blood_transfers
  SET status = 'approved', updated_at = now()
  WHERE id = transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_blood_transfer(uuid) TO authenticated;
