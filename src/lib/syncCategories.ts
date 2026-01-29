import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://rfalymblhmqkjgajlktp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kjq9y-ClW1XgZR9mo9hiOg_lf8G2jqx';

// Use service role key if available (bypasses RLS)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Types
interface Product {
  id: number | string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CSVRow {
  Name: string;
  Categories: string;
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntity(str: string): string {
  if (!str) return str;
  return str
    .toString()
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Generate slug from category name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Parse category string to extract hierarchical categories
 * Format: "Occasions > Anniversary, Best Sellers, Floral > Bouquet"
 * Returns: Array of { parent: string | null, child: string }
 */
function parseCategoryHierarchy(categoriesString: string): Array<{ parent: string | null; child: string }> {
  if (!categoriesString) return [];
  
  const trimmed = categoriesString.toString().trim();
  if (!trimmed) return [];
  
  // Split by comma to get individual entries
  const entries = trimmed.split(',').map(entry => entry.trim()).filter(entry => entry.length > 0);
  
  const result: Array<{ parent: string | null; child: string }> = [];
  
  entries.forEach(entry => {
    // Decode HTML entities
    const decoded = decodeHtmlEntity(entry);
    
    // Check if it contains " > "
    if (decoded.includes(' > ')) {
      // Split by " > " and take parts
      const parts = decoded.split(' > ').map(p => p.trim()).filter(p => p.length > 0);
      
      if (parts.length === 2) {
        // Parent > Child
        result.push({
          parent: parts[0],
          child: parts[1]
        });
      } else if (parts.length > 2) {
        // Multiple levels: take last two parts
        result.push({
          parent: parts[parts.length - 2],
          child: parts[parts.length - 1]
        });
      } else if (parts.length === 1) {
        // Only one part, treat as child with no parent
        result.push({
          parent: null,
          child: parts[0]
        });
      }
    } else {
      // No hierarchy, treat as child with no parent
      result.push({
        parent: null,
        child: decoded
      });
    }
  });
  
  return result;
}

/**
 * Find or create a category
 * Returns the category ID
 */
async function findOrCreateCategory(
  categoryName: string,
  parentId: string | null = null,
  existingCategories: Map<string, Category>
): Promise<string | null> {
  try {
    // Normalize name for lookup
    const normalizedName = categoryName.toLowerCase().trim();
    
    // Check if category already exists in our cache
    for (const cat of existingCategories.values()) {
      if (cat.name.toLowerCase() === normalizedName && cat.parent_id === parentId) {
        return cat.id;
      }
    }
    
    // Check in database (case-insensitive)
    let query = supabase
      .from('categories')
      .select('id, name, parent_id')
      .ilike('name', categoryName.trim());
    
    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error finding category "${categoryName}":`, error);
      return null;
    }
    
    if (data && data.length > 0) {
      // Category exists, add to cache and return ID
      const category = data[0] as Category;
      existingCategories.set(category.id, category);
      return category.id;
    }
    
    // Category doesn't exist, create it
    const { data: newCategory, error: insertError } = await supabase
      .from('categories')
      .insert({
        name: categoryName.trim(),
        parent_id: parentId,
        slug: generateSlug(categoryName.trim())
      })
      .select()
      .single();
    
    if (insertError) {
      console.error(`Error creating category "${categoryName}":`, insertError);
      return null;
    }
    
    if (newCategory) {
      const category = newCategory as Category;
      existingCategories.set(category.id, category);
      console.log(`  ✅ Created category: "${categoryName}"${parentId ? ' (child of parent)' : ''}`);
      return category.id;
    }
    
    return null;
  } catch (error) {
    console.error(`Error in findOrCreateCategory for "${categoryName}":`, error);
    return null;
  }
}

/**
 * Link product to category (with duplicate check)
 */
async function linkProductToCategory(
  productId: number | string,
  categoryId: string
): Promise<boolean> {
  try {
    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id')
      .eq('product_id', productId)
      .eq('category_id', categoryId)
      .maybeSingle();
    
    if (existing) {
      // Already linked, skip
      return true;
    }
    
    // Insert new relationship (upsert to handle race conditions)
    const { error } = await supabase
      .from('product_categories')
      .upsert({
        product_id: productId,
        category_id: categoryId
      }, {
        onConflict: 'product_id,category_id'
      });
    
    if (error) {
      // Check if it's a duplicate error (unique constraint violation)
      if (error.code === '23505' || error.message.includes('duplicate')) {
        // Duplicate, that's okay
        return true;
      }
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error(`Error linking product ${productId} to category ${categoryId}:`, error);
    return false;
  }
}

/**
 * Main sync function
 */
async function syncCategoriesFromCSV() {
  try {
    console.log('🔄 Starting category sync from raw_products.csv...\n');

    // Step 1: Fetch existing products
    console.log('📦 Fetching existing products from Supabase...');
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name');
    
    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }
    
    if (!productsData || productsData.length === 0) {
      console.error('❌ No products found in database. Please add products first.');
      return;
    }
    
    const products = productsData as Product[];
    const productsMap = new Map<string, Product>();
    
    // Create a map for case-insensitive lookup
    products.forEach(product => {
      const normalizedName = product.name.toLowerCase().trim();
      if (!productsMap.has(normalizedName)) {
        productsMap.set(normalizedName, product);
      }
    });
    
    console.log(`✅ Found ${products.length} products in database\n`);

    // Step 2: Fetch existing categories
    console.log('📂 Fetching existing categories from Supabase...');
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, parent_id');
    
    if (categoriesError) {
      throw new Error(`Error fetching categories: ${categoriesError.message}`);
    }
    
    const categories = (categoriesData || []) as Category[];
    const categoriesMap = new Map<string, Category>();
    
    // Create a map for lookup
    categories.forEach(category => {
      categoriesMap.set(category.id, category);
    });
    
    console.log(`✅ Found ${categories.length} existing categories in database\n`);

    // Step 3: Read CSV file
    const csvPath = path.join(process.cwd(), 'raw_products.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at ${csvPath}`);
    }
    
    console.log(`📄 Reading CSV file: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (parseResult.errors.length > 0) {
      console.warn('⚠️  CSV parsing warnings:', parseResult.errors);
    }
    
    const rows = parseResult.data;
    console.log(`✅ Parsed ${rows.length} rows from CSV\n`);

    // Step 4: Process each row
    console.log('🔄 Processing products and linking categories...\n');
    
    let processedCount = 0;
    let notFoundCount = 0;
    let linkedCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      const productName = row.Name?.trim();
      const categoriesString = row.Categories?.trim();
      
      if (!productName) {
        console.warn(`⚠️  Skipping row with no product name`);
        continue;
      }
      
      if (!categoriesString) {
        console.warn(`⚠️  Product "${productName}" has no categories, skipping`);
        continue;
      }
      
      // Find product by name (case-insensitive)
      const normalizedProductName = productName.toLowerCase();
      const product = productsMap.get(normalizedProductName);
      
      if (!product) {
        console.warn(`⚠️  Product "${productName}" not found in database, skipping`);
        notFoundCount++;
        continue;
      }
      
      processedCount++;
      console.log(`\n📦 Processing: "${productName}" (ID: ${product.id})`);
      
      // Parse categories
      const categoryHierarchies = parseCategoryHierarchy(categoriesString);
      
      if (categoryHierarchies.length === 0) {
        console.warn(`  ⚠️  No valid categories found for "${productName}"`);
        continue;
      }
      
      console.log(`  📂 Found ${categoryHierarchies.length} category/categories:`);
      
      // Process each category
      for (const { parent, child } of categoryHierarchies) {
        try {
          let categoryId: string | null = null;
          
          // If there's a parent, ensure it exists first
          if (parent) {
            const parentId = await findOrCreateCategory(parent, null, categoriesMap);
            if (parentId) {
              // Now create/find the child category under this parent
              categoryId = await findOrCreateCategory(child, parentId, categoriesMap);
            } else {
              console.warn(`  ⚠️  Failed to create parent category "${parent}", skipping child "${child}"`);
              continue;
            }
          } else {
            // No parent, create/find as top-level category
            categoryId = await findOrCreateCategory(child, null, categoriesMap);
          }
          
          if (!categoryId) {
            console.warn(`  ⚠️  Failed to get category ID for "${child}"`);
            errorCount++;
            continue;
          }
          
          // Link product to category
          const linked = await linkProductToCategory(product.id, categoryId);
          if (linked) {
            const categoryPath = parent ? `${parent} > ${child}` : child;
            console.log(`  ✅ Linked to category: "${categoryPath}"`);
            linkedCount++;
          } else {
            console.warn(`  ⚠️  Failed to link to category: "${child}"`);
            errorCount++;
          }
        } catch (error) {
          console.error(`  ❌ Error processing category "${child}":`, error);
          errorCount++;
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Processed: ${processedCount} products`);
    console.log(`⚠️  Not Found: ${notFoundCount} products (not in database)`);
    console.log(`🔗 Linked: ${linkedCount} product-category relationships`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} relationships failed`);
    }
    console.log('='.repeat(60));
    console.log('\n🎉 Category sync completed!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during category sync:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

// Run the sync function
if (import.meta.url === `file://${process.argv[1]}`) {
  syncCategoriesFromCSV();
}

export { syncCategoriesFromCSV };
