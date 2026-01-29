-- RLS Policy Check for product_categories table
-- Run this SQL in your Supabase SQL Editor to ensure public read access is enabled

-- ============================================
-- CHECK: Verify RLS is enabled
-- ============================================
-- This query shows if RLS is enabled (should return true)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'product_categories';

-- ============================================
-- FIX: Enable RLS and Add Public Read Policy
-- ============================================
-- Only run these if RLS is not properly configured

-- Enable RLS on product_categories table
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable read access for all users" ON product_categories;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users"
  ON product_categories
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- VERIFY: Check existing policies
-- ============================================
-- Run this to see all policies on product_categories
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_categories';

-- ============================================
-- NOTES:
-- ============================================
-- 1. The `USING (true)` clause allows ALL rows to be read by public users
-- 2. This is necessary for the home page to display products by category
-- 3. If you need stricter security, modify the USING clause to filter rows
