-- Fix updated_at column and trigger issue
-- Run this in Supabase SQL Editor

-- First, check if updated_at column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to products table';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Drop the trigger if it exists (to recreate it)
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Recreate the trigger function (fix the issue)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update updated_at if the column exists
  IF TG_TABLE_NAME = 'products' THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('created_at', 'updated_at')
ORDER BY column_name;

