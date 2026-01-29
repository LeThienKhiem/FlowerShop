-- Debug Script: Check Featured Categories Status
-- Run this SQL in your Supabase SQL Editor to verify the is_featured column and data

-- ============================================
-- STEP 1: Check if is_featured column exists
-- ============================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'categories' AND column_name = 'is_featured';

-- ============================================
-- STEP 2: If column doesn't exist, create it
-- ============================================
-- Uncomment and run if the above query returns no rows
-- ALTER TABLE categories 
-- ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- ============================================
-- STEP 3: Check all categories and their is_featured status
-- ============================================
SELECT 
  id, 
  name, 
  is_featured,
  CASE 
    WHEN is_featured IS NULL THEN 'NULL (column might not exist)'
    WHEN is_featured = true THEN 'TRUE ✓'
    WHEN is_featured = false THEN 'FALSE'
    ELSE 'UNKNOWN: ' || is_featured::text
  END as status
FROM categories
ORDER BY name;

-- ============================================
-- STEP 4: Check featured categories specifically
-- ============================================
SELECT id, name, is_featured
FROM categories
WHERE is_featured = true
ORDER BY name;

-- ============================================
-- STEP 5: Manually set a category as featured (for testing)
-- ============================================
-- Replace 'YOUR_CATEGORY_NAME' with an actual category name
-- UPDATE categories 
-- SET is_featured = true 
-- WHERE name = 'YOUR_CATEGORY_NAME';

-- ============================================
-- STEP 6: Verify the update worked
-- ============================================
-- Run STEP 4 again to see if the category appears

-- ============================================
-- STEP 7: Check RLS policies on categories table
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
