-- Store settings: closed_dates for useShopDates / Admin Date Management
-- Creates table if missing; adds closed_dates if your existing table does not have it.

CREATE TABLE IF NOT EXISTS public.store_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  closed_dates TEXT[] DEFAULT '{}'
);

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS closed_dates TEXT[] DEFAULT '{}';

-- Ensure row id=1 exists for upsert
INSERT INTO public.store_settings (id, closed_dates)
VALUES (1, ARRAY['2026-01-01', '2026-12-25', '2026-12-26']::TEXT[])
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.store_settings.closed_dates IS 'YYYY-MM-DD dates when store is closed (no delivery).';
