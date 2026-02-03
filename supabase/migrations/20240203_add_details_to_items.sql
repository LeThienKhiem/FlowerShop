-- Add delivery and recipient details to order_items table
-- Enables per-item delivery date, recipient, and card message (e.g. for split shipments or future multi-date orders).
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD COLUMN IF NOT EXISTS recipient_address TEXT,
ADD COLUMN IF NOT EXISTS card_message TEXT;

COMMENT ON COLUMN public.order_items.delivery_date IS 'Delivery date specific to this item';
COMMENT ON COLUMN public.order_items.recipient_name IS 'Recipient name for this item';
COMMENT ON COLUMN public.order_items.recipient_phone IS 'Recipient phone for this item';
COMMENT ON COLUMN public.order_items.recipient_address IS 'Full delivery address (street, suburb, state, postcode) for this item';
COMMENT ON COLUMN public.order_items.card_message IS 'Gift/card message for this item';
