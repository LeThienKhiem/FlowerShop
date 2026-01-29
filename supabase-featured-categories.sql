-- Add is_featured column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for faster queries on featured categories
CREATE INDEX IF NOT EXISTS idx_categories_is_featured ON categories(is_featured) WHERE is_featured = true;

-- Add comment to column
COMMENT ON COLUMN categories.is_featured IS 'Whether this category should be featured on the home page';
