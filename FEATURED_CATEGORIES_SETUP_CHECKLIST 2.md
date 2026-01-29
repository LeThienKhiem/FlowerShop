# Featured Categories Setup Checklist

If Featured Categories are not showing on the Home Page, follow these steps:

## Step 1: Run SQL Scripts in Supabase

### 1.1 Add `is_featured` column
Run this SQL in your Supabase SQL Editor:
```sql
-- File: supabase-featured-categories.sql
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_categories_is_featured ON categories(is_featured) WHERE is_featured = true;

COMMENT ON COLUMN categories.is_featured IS 'Whether this category should be featured on the home page';
```

### 1.2 Verify RLS Policies for product_categories
Run this SQL in your Supabase SQL Editor:
```sql
-- File: supabase-product-categories-rls-check.sql
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
```

## Step 2: Mark Categories as Featured in Admin

1. Go to `/admin/categories`
2. Check the "Featured on Home" checkbox for the categories you want to show
3. Click "Update Featured Categories" button
4. Verify the checkbox stays checked after clicking

## Step 3: Verify Products are Linked to Categories

1. Go to `/admin/products`
2. For each category you marked as featured, ensure products are linked:
   - Click "Edit Categories" on a product
   - Check the categories that product belongs to
   - Save

## Step 4: Check Browser Console

1. Open Browser DevTools (F12)
2. Go to Console tab
3. Refresh the Home Page
4. Look for these logs:
   - "Fetching featured categories from Supabase..."
   - "Featured categories query result: ..."
   - "Found X featured categories: ..."

### Common Errors:

**Error: "column 'is_featured' does not exist"**
- **Solution:** Run `supabase-featured-categories.sql` in Supabase SQL Editor

**Error: "permission denied for table product_categories"**
- **Solution:** Run `supabase-product-categories-rls-check.sql` in Supabase SQL Editor

**No error, but empty array:**
- **Check:** Go to Admin Dashboard, verify categories have `is_featured = true`
- **Check:** Ensure products are linked to those categories via `product_categories` table

**Categories show but no products:**
- **Check:** Products must be linked to categories via `product_categories` junction table
- **Check:** Products must have `in_stock = true`
- **Check:** RLS policies allow reading from `product_categories` table

## Step 5: Test the Flow

1. Admin → `/admin/categories` → Check "Featured on Home" for 2-3 categories
2. Click "Update Featured Categories"
3. Click "View Home Page"
4. Verify:
   - Category tabs appear (if > 1 category)
   - Products load when clicking a tab
   - "Explore [Category] Collection" button works

## Quick Debug Commands (Supabase SQL Editor)

### Check if column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories' AND column_name = 'is_featured';
```

### Check featured categories:
```sql
SELECT id, name, is_featured 
FROM categories 
WHERE is_featured = true;
```

### Check product-category links:
```sql
SELECT pc.category_id, c.name as category_name, COUNT(pc.product_id) as product_count
FROM product_categories pc
JOIN categories c ON c.id = pc.category_id
WHERE c.is_featured = true
GROUP BY pc.category_id, c.name;
```

### Verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'product_categories';
```
