import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ProductCard, { Product } from '../components/ProductCard';
import Header from '../components/Header';
import CategoryBar from '../components/CategoryBar';
import ProductSkeleton from '../components/ProductSkeleton';

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<{ id: number; name: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategoryProducts() {
      if (!slug) {
        setError('Invalid category slug');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Find category by slug (case-insensitive)
        // First try exact match, then try slug generated from name
        let { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id, name, slug')
          .eq('slug', slug)
          .single();

        // If not found, try case-insensitive match on name
        if (categoryError || !categoryData) {
          const normalizedSlug = slug.toLowerCase().replace(/-/g, ' ');
          const { data: allCategories } = await supabase
            .from('categories')
            .select('id, name, slug');
          
          if (allCategories) {
            categoryData = allCategories.find(cat => 
              cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') === slug ||
              cat.name.toLowerCase() === normalizedSlug ||
              (cat.slug && cat.slug.toLowerCase() === slug.toLowerCase())
            ) || null;
          }
        }

        if (!categoryData) {
          setError('Category not found');
          setIsLoading(false);
          return;
        }

        setCategory({ id: categoryData.id, name: categoryData.name });

        // Get product IDs from product_categories
        const { data: productCategories, error: pcError } = await supabase
          .from('product_categories')
          .select('product_id')
          .eq('category_id', categoryData.id);

        if (pcError) {
          console.error('Error fetching product categories:', pcError);
          setError('Error loading products');
          setIsLoading(false);
          return;
        }

        if (!productCategories || productCategories.length === 0) {
          setProducts([]);
          setIsLoading(false);
          return;
        }

        const productIds = productCategories.map(pc => pc.product_id);

        const productSelect = `
          id,
          name,
          price,
          sale_price,
          images,
          description,
          in_stock,
          created_at,
          product_categories(
            category_id,
            categories(
              id,
              name,
              slug
            )
          )
        `;

        // Fetch products with category relation data for ProductCard
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(productSelect)
          .in('id', productIds)
          .eq('in_stock', true)
          .order('created_at', { ascending: false });

        if (productsError) {
          console.error('Error fetching products:', productsError);
          setError('Error loading products');
        } else if (productsData) {
          const transformedProducts: Product[] = (productsData as any[]).map((product) => {
            const categories: { id: string; name: string; slug?: string | null }[] = [];

            if (product.product_categories && Array.isArray(product.product_categories)) {
              product.product_categories.forEach((pc: any) => {
                if (pc.categories?.id) {
                  categories.push({
                    id: pc.categories.id,
                    name: pc.categories.name,
                    slug: pc.categories.slug ?? null,
                  });
                }
              });
            }

            if (categories.length === 0 && categoryData?.id && categoryData?.name) {
              categories.push({
                id: String(categoryData.id),
                name: categoryData.name,
                slug: categoryData.slug ?? null,
              });
            }

            const { product_categories: _ignored, ...rest } = product || {};
            return {
              ...rest,
              categories,
              category: {
                id: String(categoryData.id),
                name: categoryData.name,
                slug: categoryData.slug ?? null,
              },
            };
          });

          setProducts(transformedProducts);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading category products:', err);
        setError('An unexpected error occurred');
        setIsLoading(false);
      }
    }

    loadCategoryProducts();
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      {/* Category Bar with Scroll Navigation */}
      <CategoryBar activeSlug={slug || null} />
      
      <main className="py-16 px-6 flex-1">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex flex-wrap justify-center gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`category-skeleton-${i}`}
                  className="w-full sm:w-[300px]"
                >
                  <ProductSkeleton />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500 font-sans">{error}</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-center mb-12 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                {category?.name || 'Category'}
              </h1>
              
              {products.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="w-full sm:w-[300px]"
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-500 font-sans">No products found in this category.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm font-sans">
              &copy; {new Date().getFullYear()} Welcome to Magnolia. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CategoryPage;
