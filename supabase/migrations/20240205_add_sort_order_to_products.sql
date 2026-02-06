-- Add sort_order to products for manual display ranking (e.g. promote Valentine's items to top)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.products.sort_order IS 'Lower numbers appear first on shop/category pages. Default 100. Use 1 to pin to top.';

CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(sort_order);
