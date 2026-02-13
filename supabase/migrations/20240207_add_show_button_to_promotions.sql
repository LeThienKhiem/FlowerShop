-- Add show_button to promotions: when true, show CTA button; when false, hide it.
ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS show_button BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.promotions.show_button IS 'When true, show the CTA button (cta_text/cta_link). When false, only title, image, and contact are shown.';
