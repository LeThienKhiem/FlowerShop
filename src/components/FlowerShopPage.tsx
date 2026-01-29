import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ProductCard, { Product, Category } from '../components/ProductCard';
import Header from './Header';
import CategoryBar from './CategoryBar';

const FlowerShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all products with their categories from Supabase
  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        
        // Fetch products with their categories using join
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            product_categories!inner(
              category_id,
              categories!inner(
                id,
                name
              )
            )
          `)
          .eq('in_stock', true)
          .order('created_at', { ascending: false });

        // If inner join returns no results (some products have no categories),
        // try left join instead
        let finalData = productsData;
        if (!productsData || productsData.length === 0 || productsError) {
          const { data: productsDataLeft, error: productsErrorLeft } = await supabase
            .from('products')
            .select(`
              *,
              product_categories(
                category_id,
                categories(
                  id,
                  name
                )
              )
            `)
            .eq('in_stock', true)
            .order('created_at', { ascending: false });

          if (productsErrorLeft) {
            throw productsErrorLeft;
          }
          finalData = productsDataLeft;
        }

        // Transform the nested structure to flat products with categories array
        const transformedProducts: Product[] = (finalData || []).map((product: any) => {
          const productCategories: Category[] = [];
          
          if (product.product_categories && Array.isArray(product.product_categories)) {
            product.product_categories.forEach((pc: any) => {
              if (pc.categories && pc.categories.id) {
                productCategories.push({
                  id: pc.categories.id,
                  name: pc.categories.name,
                });
              }
            });
          }

          // Remove the nested structure and add categories array
          const { product_categories: _, ...productWithoutPC } = product;
          return {
            ...productWithoutPC,
            categories: productCategories,
          };
        });

        setProducts(transformedProducts);
      } catch (error) {
        console.error('Error loading products:', error);
        // Fallback: fetch products without categories
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select('*')
          .eq('in_stock', true)
          .order('created_at', { ascending: false });

        if (!fallbackError && fallbackData) {
          setProducts(fallbackData.map((p: any) => ({ ...p, categories: [] })));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Show all products on the shop page (no filtering)
  const filteredProducts = products;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
      {/* Hero Section */}
      <section 
        className="relative h-[600px] md:h-[700px] flex items-center justify-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1563241527-3004b7be0fee?auto=format&fit=crop&w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white mb-6 tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Blooms & Emotions
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 font-light max-w-2xl mx-auto">
            Express your feelings with the beauty of nature
          </p>
          <button className="px-8 py-4 border-2 border-white text-white font-medium text-lg transition-all duration-300 hover:bg-white hover:text-black">
            Order flowers
          </button>
        </div>
      </section>

      {/* Shop Section with Category Filter */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <h2 
            className="text-4xl md:text-5xl font-serif font-bold text-gray-800 text-center mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Shop All Products
          </h2>

          {/* Category Bar with Scroll Navigation */}
          <CategoryBar activeSlug="all" />

          {/* Product Grid */}
          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-gray-500 font-sans">Loading products...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 font-sans">
                No products available.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Selling Points Section */}
      <section className="py-16 md:py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Item 1: Same Day Delivery */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                SAME DAY DELIVERY
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Apply for orders placed before 2pm. After the cut off time, please call <a href="tel:+61398773164" className="text-gray-900 hover:underline">(03) 9877 3164</a>.
              </p>
            </div>

            {/* Item 2: Daily Fresh Markets */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                DAILY FRESH MARKETS
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Brighten up your day with fresh local and imported flowers arrived daily.
              </p>
            </div>

            {/* Item 3: Emotion Creator */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                EMOTION CREATOR
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                We are not just making bouquets, We are creating emotions for all life's occasions.
              </p>
            </div>
          </div>
        </div>
      </section>

      </main>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm font-sans">
              &copy; {new Date().getFullYear()} Blooms & Emotions. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300" aria-label="Facebook">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300" aria-label="Instagram">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300" aria-label="Twitter">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FlowerShopPage;


