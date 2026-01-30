-- Promotion Popup: table, storage bucket, RLS
-- Run this in the Supabase SQL Editor.

-- 1. Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  shop_name TEXT,
  title TEXT,
  cta_text TEXT DEFAULT 'Shop Now',
  cta_link TEXT DEFAULT '/shop?category=Valentine''s Day',
  contact_info TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: add updated_at and trigger (like products)
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

-- Seed row id=1 for the "main" promotion (used by admin UI)
INSERT INTO promotions (id, shop_name, title, cta_text, cta_link, contact_info, image_url, is_active)
VALUES (
  1,
  'Magnolia Florist',
  'Happy Valentine''s Day',
  'Shop Now',
  '/shop?category=Valentine''s Day',
  'Call us at (03) 9877 3164 for further assistance!',
  'https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/Popup/valentine.png',
  false
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage bucket: ensure public bucket `popups` exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('popups', 'popups', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 3. Storage RLS: public read, allow insert/update/delete for popups bucket
-- (Admin uses anon key; restrict by bucket only.)
DROP POLICY IF EXISTS "Public read popups" ON storage.objects;
CREATE POLICY "Public read popups"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'popups');

DROP POLICY IF EXISTS "Allow insert popups" ON storage.objects;
CREATE POLICY "Allow insert popups"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'popups');

DROP POLICY IF EXISTS "Allow update popups" ON storage.objects;
CREATE POLICY "Allow update popups"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'popups');

DROP POLICY IF EXISTS "Allow delete popups" ON storage.objects;
CREATE POLICY "Allow delete popups"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'popups');

-- 4. Promotions RLS: public read, allow write for admin (anon-friendly)
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read promotions" ON promotions;
CREATE POLICY "Public read promotions"
  ON promotions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert promotions" ON promotions;
CREATE POLICY "Allow insert promotions"
  ON promotions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update promotions" ON promotions;
CREATE POLICY "Allow update promotions"
  ON promotions FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow delete promotions" ON promotions;
CREATE POLICY "Allow delete promotions"
  ON promotions FOR DELETE
  USING (true);
