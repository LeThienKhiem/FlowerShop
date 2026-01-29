-- Product-Categories Junction Table Setup
-- Run this SQL in your Supabase SQL Editor
-- This ensures the product_categories table exists with correct structure

-- ============================================
-- TASK 1: Create/Verify Product-Categories Junction Table
-- ============================================

-- Create the junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, category_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

-- Create composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_categories_composite ON product_categories(product_id, category_id);

-- ============================================
-- TASK 2: Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on product_categories table
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to product_categories
DROP POLICY IF EXISTS "Allow public read access to product_categories" ON product_categories;
CREATE POLICY "Allow public read access to product_categories"
  ON product_categories
  FOR SELECT
  USING (true);

-- Allow authenticated users to manage product_categories
DROP POLICY IF EXISTS "Allow authenticated users to manage product_categories" ON product_categories;
CREATE POLICY "Allow authenticated users to manage product_categories"
  ON product_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to manage product_categories (for sync script)
-- WARNING: This is less secure but allows sync script to work without auth
-- Remove this if you implement proper authentication
DROP POLICY IF EXISTS "Allow anon users to manage product_categories" ON product_categories;
CREATE POLICY "Allow anon users to manage product_categories"
  ON product_categories
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- NOTES:
-- ============================================
-- 1. product_id is BIGINT (matches products.id which is BIGSERIAL)
-- 2. category_id is UUID (matches categories.id which is UUID)
-- 3. UNIQUE constraint prevents duplicate product-category pairs
-- 4. CASCADE delete ensures cleanup when product or category is deleted
-- 5. Indexes optimize queries for filtering products by category
