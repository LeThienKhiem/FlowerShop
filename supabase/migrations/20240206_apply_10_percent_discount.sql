-- Apply 10% discount to all products by setting sale_price to 90% of price.
-- Existing sale_price values are replaced so every product shows 10% off.
UPDATE public.products
SET sale_price = ROUND((price * 0.9)::numeric, 2)
WHERE price IS NOT NULL AND price > 0;
