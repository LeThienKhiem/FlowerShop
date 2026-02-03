-- Add extra quantity columns to order_items for Bear, Balloon, Chocolate, Vase, Wine
-- So confirmation emails and admin can show correct extra counts per item.
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS balloon_qty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bear_qty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS chocolate_qty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS vase_qty INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS wine_qty INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.order_items.balloon_qty IS 'Quantity of balloon add-on for this line';
COMMENT ON COLUMN public.order_items.bear_qty IS 'Quantity of bear add-on for this line';
COMMENT ON COLUMN public.order_items.chocolate_qty IS 'Quantity of chocolate add-on for this line';
COMMENT ON COLUMN public.order_items.vase_qty IS 'Quantity of vase add-on for this line';
COMMENT ON COLUMN public.order_items.wine_qty IS 'Quantity of wine add-on for this line';
