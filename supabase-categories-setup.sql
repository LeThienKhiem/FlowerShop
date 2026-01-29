-- Supabase Categories System Setup
-- Run this SQL in your Supabase SQL Editor
-- This script creates the categories table and product_categories join table

-- ============================================
-- TASK 1: Create Categories Table
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ============================================
-- TASK 2: Create Product-Category Join Table
-- ============================================
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

-- ============================================
-- TASK 3: Update updated_at trigger for categories
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for categories table
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TASK 4: Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories
DROP POLICY IF EXISTS "Allow public read access to categories" ON categories;
CREATE POLICY "Allow public read access to categories"
  ON categories
  FOR SELECT
  USING (true);

-- Allow authenticated users to manage categories (for admin)
DROP POLICY IF EXISTS "Allow authenticated users to manage categories" ON categories;
CREATE POLICY "Allow authenticated users to manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert/update/delete (for admin without auth)
-- WARNING: This is less secure but allows admin functionality without authentication
-- Remove this if you implement proper authentication
DROP POLICY IF EXISTS "Allow anon users to manage categories" ON categories;
CREATE POLICY "Allow anon users to manage categories"
  ON categories
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

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

-- Allow anonymous users to manage product_categories (for admin without auth)
DROP POLICY IF EXISTS "Allow anon users to manage product_categories" ON product_categories;
CREATE POLICY "Allow anon users to manage product_categories"
  ON product_categories
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TASK 5: Helper Function to Generate Slug
-- ============================================
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TASK 6: Auto-generate slug on insert/update
-- ============================================
CREATE OR REPLACE FUNCTION auto_generate_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_category_slug ON categories;
CREATE TRIGGER trigger_auto_generate_category_slug
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_category_slug();

-- ============================================
-- NOTES:
-- ============================================
-- 1. The categories table uses UUID for id (modern approach)
-- 2. The slug is auto-generated from the name if not provided
-- 3. parent_id allows for hierarchical categories (optional)
-- 4. RLS policies allow public read but require auth for write (or anon for admin)
-- 5. The product_categories table creates a many-to-many relationship
-- 6. Run the seed-categories.js script to import categories from CSV
