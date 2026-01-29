-- Add is_featured column to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

-- Optional: Add a comment to the column
COMMENT ON COLUMN products.is_featured IS 'Whether this product should be featured on the homepage';

-- Fix Row-Level Security (RLS) policies to allow INSERT operations
-- First, check if RLS is enabled (it should be)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public inserts" ON products;
DROP POLICY IF EXISTS "Enable insert for anon users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;

-- Create a policy that allows INSERT for anonymous users (for migration script)
CREATE POLICY "Enable insert for anon users" ON products
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow INSERT for authenticated users (if you have auth later)
CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure SELECT, UPDATE, DELETE policies exist (for admin dashboard)
-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;

-- Allow public read access
CREATE POLICY "Enable read access for all users" ON products
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update
CREATE POLICY "Enable update for authenticated users" ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Enable delete for authenticated users" ON products
  FOR DELETE
  TO authenticated
  USING (true);

-- If you want to allow anon users to update/delete (for admin dashboard without auth):
-- Uncomment these if your admin dashboard doesn't use authentication
CREATE POLICY "Enable update for anon users" ON products
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for anon users" ON products
  FOR DELETE
  TO anon
  USING (true);

