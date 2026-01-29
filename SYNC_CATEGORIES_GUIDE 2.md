# Category Sync Guide

This guide explains how to sync categories from `raw_products.csv` to existing products in Supabase.

## 📋 Overview

The sync process:
1. Reads `raw_products.csv` (with `Name` and `Categories` columns)
2. Matches products by name (case-insensitive)
3. Parses hierarchical categories (e.g., "Occasions > Anniversary")
4. Creates parent/child categories if they don't exist
5. Links products to categories via `product_categories` junction table
6. **Does NOT overwrite** any existing product details (price, description, etc.)

---

## 🗄️ TASK 1: Database Setup

### Step 1: Run SQL Script

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-product-categories-junction.sql`
4. Click **Run** to execute

This will:
- Create/verify the `product_categories` junction table
- Set up indexes for performance
- Configure RLS policies

**Note**: The table structure:
- `product_id`: BIGINT (references `products.id`)
- `category_id`: UUID (references `categories.id`)
- Unique constraint on `(product_id, category_id)` to prevent duplicates

---

## 🔄 TASK 2: Run Sync Script

### Step 1: Install Dependencies (if needed)

The script requires `papaparse` and `dotenv`:

```bash
npm install papaparse dotenv
```

### Step 2: Set Up Environment (Optional)

Create/update `.env` file:

```env
SUPABASE_URL=https://rfalymblhmqkjgajlktp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=sb_publishable_kjq9y-ClW1XgZR9mo9hiOg_lf8G2jqx
```

**Note**: Service role key bypasses RLS. Get it from Supabase Dashboard → Settings → API → `service_role` key.

### Step 3: Run Sync Script

```bash
node scripts/sync-categories.js
```

---

## 📊 How It Works

### CSV Format

The `raw_products.csv` should have:
- **Name**: Product name (must match exactly with products in database)
- **Categories**: Comma-separated category strings

Example:
```csv
Name,Categories
Pastel love,"Occasions > Anniversary, Best Sellers, Occasions > Birthday"
Loving Mum,"Occasions > Anniversary, Floral > Arrangement, Best Sellers"
```

### Category Parsing

The script handles:
1. **Hierarchical categories**: `"Occasions > Anniversary"` → Creates parent "Occasions" and child "Anniversary"
2. **Top-level categories**: `"Best Sellers"` → Creates as top-level category
3. **Multiple categories**: Comma-separated list → Processes each one
4. **HTML entities**: `Mother&#039;s day` → Decodes to `Mother's day`

### Process Flow

For each CSV row:
1. **Find Product**: Match `Name` with product in database (case-insensitive)
2. **Parse Categories**: Split by comma, handle hierarchy
3. **Ensure Categories Exist**:
   - If parent exists → Use it
   - If parent doesn't exist → Create it
   - If child exists under parent → Use it
   - If child doesn't exist → Create it under parent
4. **Link Product to Category**: Insert into `product_categories` (skip if already exists)

---

## 📝 Output Example

```
🔄 Starting category sync from raw_products.csv...

📦 Fetching existing products from Supabase...
✅ Found 150 products in database

📂 Fetching existing categories from Supabase...
✅ Found 25 existing categories in database

📄 Reading CSV file: .../raw_products.csv
✅ Parsed 150 rows from CSV

🔄 Processing products and linking categories...

📦 Processing: "Pastel love" (ID: 1)
  📂 Found 8 category/categories:
  ✅ Created category: "Occasions" (child of parent)
  ✅ Created category: "Anniversary" (child of parent)
  ✅ Linked to category: "Occasions > Anniversary"
  ✅ Linked to category: "Best Sellers"
  ...

============================================================
📊 SYNC SUMMARY
============================================================
✅ Processed: 145 products
⚠️  Not Found: 5 products (not in database)
🔗 Linked: 580 product-category relationships
============================================================

🎉 Category sync completed!
```

---

## ⚠️ Important Notes

### Product Matching

- Matching is **case-insensitive**
- Product names must match exactly (after trimming whitespace)
- If a product is not found, it's skipped with a warning

### Category Creation

- Categories are created automatically if they don't exist
- Parent categories are created before child categories
- Slugs are auto-generated from category names
- Duplicate categories are skipped (based on name + parent_id)

### Duplicate Prevention

- The script uses `upsert` with `onConflict` to handle duplicates
- If a product-category link already exists, it's skipped
- No errors are thrown for existing relationships

### Data Safety

- **Products are NOT modified** - only the `product_categories` table is updated
- Product details (price, description, images) remain unchanged
- You can run the script multiple times safely (idempotent)

---

## 🔧 Troubleshooting

### "Product not found in database"

- Check that product names in CSV match exactly with database
- Names are matched case-insensitively
- Check for extra spaces or special characters

### "Error creating category"

- Check RLS policies allow inserts
- Ensure `categories` table exists
- Check Supabase connection

### "Error linking product to category"

- Verify `product_categories` table exists
- Check foreign key constraints
- Ensure both product_id and category_id are valid

### "CSV file not found"

- Ensure `raw_products.csv` is in the project root
- Check file path in the script

---

## 📚 Related Files

- `supabase-product-categories-junction.sql` - Junction table setup
- `scripts/sync-categories.js` - Main sync script
- `src/lib/syncCategories.ts` - TypeScript version (for import)
- `raw_products.csv` - Source CSV file

---

## 🚀 Quick Start Checklist

- [ ] Run `supabase-product-categories-junction.sql` in Supabase
- [ ] Verify `product_categories` table exists
- [ ] Ensure `raw_products.csv` is in project root
- [ ] Install dependencies: `npm install papaparse dotenv`
- [ ] (Optional) Add `SUPABASE_SERVICE_ROLE_KEY` to `.env`
- [ ] Run: `node scripts/sync-categories.js`
- [ ] Check output for any warnings or errors
- [ ] Verify links in Supabase Dashboard
