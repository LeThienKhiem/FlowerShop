# Category Management System Setup Guide

This guide will help you set up the Product Category System for your Flower Shop application.

## 📋 Overview

The category system includes:
- **Database tables**: `categories` and `product_categories` (many-to-many relationship)
- **Admin UI**: Manage categories via `/admin/categories`
- **Dynamic filtering**: Shop page uses categories from database
- **CSV import**: Script to seed categories from your CSV file

---

## 🗄️ TASK 1: Database Setup

### Step 1: Run SQL Script in Supabase

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-categories-setup.sql`
4. Click **Run** to execute the script

This will create:
- `categories` table (with UUID id, name, slug, parent_id)
- `product_categories` join table (many-to-many relationship)
- Indexes for performance
- RLS policies for security
- Auto-slug generation trigger

### Step 2: Verify Tables

After running the SQL, verify the tables exist:
- Check **Table Editor** in Supabase Dashboard
- You should see `categories` and `product_categories` tables

---

## 📥 TASK 2: Seed Categories from CSV

### Step 1: Prepare Environment

Ensure your `.env` file has:
```env
SUPABASE_URL=https://rfalymblhmqkjgajlktp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note**: Service role key bypasses RLS. Get it from Supabase Dashboard → Settings → API → `service_role` key.

### Step 2: Run Seed Script

```bash
node scripts/seed-categories.js
```

This script will:
- Read `woocommerce-products.csv` from project root
- Extract unique category names from the `Categories` column
- Parse hierarchical categories (e.g., "Occasions > Anniversary" → "Anniversary")
- Create categories in the database (skipping duplicates)
- Generate slugs automatically

**Output Example**:
```
🌱 Starting category seeding process...
📄 Reading CSV file: ...
✅ Parsed 150 rows from CSV
📂 Extracting categories from CSV...
✅ Found 25 unique categories:
   1. Anniversary
   2. Best Sellers
   3. Birthday
   ...
📝 Creating 25 new categories...
   ✅ Created: Anniversary
   ✅ Created: Best Sellers
   ...
🎉 Category seeding completed!
```

---

## 🎛️ TASK 3: Admin Management UI

### Access Admin Page

Navigate to: **http://localhost:5173/admin/categories**

### Features Available:

1. **Add Category**
   - Enter category name in the input field
   - Click "Add Category" button
   - Slug is auto-generated

2. **Edit Category**
   - Click "Edit" button next to any category
   - Modify the name
   - Click "Save" or press Enter
   - Click "Cancel" or press Escape to cancel

3. **Delete Category**
   - Click "Delete" button next to any category
   - Confirm deletion
   - **Warning**: This also removes all product associations

---

## 🔗 TASK 4: Integration with Shop Page

The `FlowerShopPage.tsx` and `Shop.tsx` components already fetch categories dynamically from Supabase:

```typescript
// Categories are fetched automatically
const { data } = await supabase
  .from('categories')
  .select('id, name')
  .order('name', { ascending: true });
```

The filter bar on the Shop page will automatically show all categories from the database.

---

## 📝 Notes

### Category Structure

- **id**: UUID (auto-generated)
- **name**: Text (unique, required)
- **slug**: Text (auto-generated from name, unique)
- **parent_id**: UUID (optional, for hierarchical categories)
- **created_at**: Timestamp (auto-generated)
- **updated_at**: Timestamp (auto-updated)

### Product-Category Relationship

- Products can belong to multiple categories
- Categories can have multiple products
- Relationship stored in `product_categories` join table
- Deleting a category removes all product associations

### CSV Format

The seed script expects CSV with a `Categories` column:
```
Categories
"Occasions > Anniversary, Best Sellers"
"Floral > Bouquet, Designer's Choice"
"Birthday, Love"
```

The script extracts the last part after `>` or uses the whole entry if no `>` is present.

---

## 🚀 Quick Start Checklist

- [ ] Run `supabase-categories-setup.sql` in Supabase SQL Editor
- [ ] Verify tables created in Supabase Dashboard
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` file
- [ ] Run `node scripts/seed-categories.js` to import from CSV
- [ ] Visit `/admin/categories` to manage categories
- [ ] Visit `/shop` to see categories in filter bar

---

## 🔧 Troubleshooting

### "Error: SUPABASE_SERVICE_ROLE_KEY must be set"
- Add the service role key to your `.env` file
- Get it from Supabase Dashboard → Settings → API

### "Categories already exist"
- The script skips duplicates automatically
- Check existing categories in Supabase Dashboard

### "RLS Policy Error"
- The SQL script includes policies for anonymous users
- If you have auth, you may need to adjust policies

### "CSV file not found"
- Ensure `woocommerce-products.csv` is in the project root
- Check the file path in the script

---

## 📚 Related Files

- `supabase-categories-setup.sql` - Database schema
- `src/pages/AdminCategory.tsx` - Admin UI component
- `scripts/seed-categories.js` - CSV import script
- `src/pages/Shop.tsx` - Shop page with category filtering
- `src/components/FlowerShopPage.tsx` - Alternative shop page
