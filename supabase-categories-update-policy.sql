-- Fix RLS Policy for Categories UPDATE
-- Run this SQL in your Supabase SQL Editor
-- This ensures anonymous/public users can UPDATE the is_featured column

-- ============================================
-- Check Current Policies
-- ============================================
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
WHERE tablename = 'categories';

-- ============================================
-- Fix: Allow public/anonymous UPDATE for is_featured
-- ============================================

-- Drop existing update policies if they exist
DROP POLICY IF EXISTS "Allow public update for is_featured" ON categories;
DROP POLICY IF EXISTS "Allow anon users to update categories" ON categories;

-- Create policy to allow UPDATE for anonymous/public users
-- This allows the admin page (without authentication) to update is_featured
CREATE POLICY "Allow public update for is_featured"
  ON categories
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Alternative: If the above doesn't work, try allowing all operations for anon
CREATE POLICY "Allow anon users to update categories"
  ON categories
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verify Policies After Creation
-- ============================================
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'categories'
ORDER BY cmd, policyname;

-- ============================================
-- Test: Try updating a category
-- ============================================
-- Uncomment and replace with actual category ID to test
-- UPDATE categories 
-- SET is_featured = true 
-- WHERE id = 'YOUR_CATEGORY_ID_HERE'
-- RETURNING id, name, is_featured;
