import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductCard, { Product } from './ProductCard';
import ProductSkeleton from './ProductSkeleton';

interface CategoryShowcaseProps {
  title: string;
  slug: string;
  bgColor?: string;
}

const FadeIn: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.6 }}
  >
    {children}
  </motion.div>
);

const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ 
  title, 
  slug, 
  bgColor 
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategoryProducts() {
      try {
        setIsLoading(true);
        setError(null);

        // Find category by slug (case-insensitive)
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
          setProducts([]);
          setIsLoading(false);
          return;
        }

        // Get product IDs from product_categories
        const { data: productCategories, error: pcError } = await supabase
          .from('product_categories')
          .select('product_id')
          .eq('category_id', categoryData.id);

        if (pcError) {
          console.error('Error fetching product categories:', pcError);
          setError('Error loading products');
          setProducts([]);
          setIsLoading(false);
          return;
        }

        if (!productCategories || productCategories.length === 0) {
          setProducts([]);
          setIsLoading(false);
          return;
        }

        const productIds = productCategories.map(pc => pc.product_id);

        // Fetch products - limit to 8
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds)
          .eq('in_stock', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(8);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          setError('Error loading products');
          setProducts([]);
        } else if (productsData) {
          setProducts(productsData as Product[]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading category products:', err);
        setError('An unexpected error occurred');
        setProducts([]);
        setIsLoading(false);
      }
    }

    loadCategoryProducts();
  }, [slug]);

  const sectionStyle = bgColor ? { backgroundColor: bgColor } : {};

  return (
    <section 
      className="py-12 px-6"
      style={sectionStyle}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header: Uppercase, Bold, Centered Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 uppercase tracking-wide font-sans">
          {title}
        </h2>

        {/* Loading State */}
        {isLoading ? (
          <div className="columns-2 md:columns-4 gap-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={`showcase-skeleton-${i}`} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-gray-500 font-sans">{error}</p>
          </div>
        ) : products.length > 0 ? (
          <>
            {/* Masonry Grid Layout */}
            <FadeIn className="columns-2 md:columns-4 gap-4 space-y-4 mb-8">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  className="break-inside-avoid"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </FadeIn>

            {/* CTA Button: Editorial Luxury style, centered */}
            <FadeIn className="flex justify-center mt-8">
              <Link
                to={`/category/${slug}`}
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 overflow-hidden transition-all duration-500 ease-out border border-stone-900 rounded-none bg-white hover:bg-stone-900"
              >
                <span className="font-serif text-sm font-medium tracking-[0.2em] uppercase text-stone-900 group-hover:text-white transition-colors duration-300">
                  SHOP THE COLLECTION
                </span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-in-out group-hover:translate-x-2 group-hover:text-white text-stone-900" />
              </Link>
            </FadeIn>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 font-sans">No products available in this category.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryShowcase;
