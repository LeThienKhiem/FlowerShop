-- Supabase Products Table Schema
-- Run this SQL in your Supabase SQL Editor

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2),
  category TEXT NOT NULL,
  description TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  in_stock BOOLEAN DEFAULT true,
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Create an index on in_stock for filtering
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at on row update
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access (for your website)
CREATE POLICY "Allow public read access"
  ON products
  FOR SELECT
  USING (true);

-- Create a policy to allow authenticated users to insert/update/delete (for admin)
-- Note: You'll need to set up Supabase Auth for this to work
-- For now, you can disable RLS or adjust policies based on your needs
-- CREATE POLICY "Allow authenticated users to manage products"
--   ON products
--   FOR ALL
--   USING (auth.role() = 'authenticated');

-- If you want to disable RLS for now (less secure but easier to test):
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;


