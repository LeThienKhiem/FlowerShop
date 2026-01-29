import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import ProductCard, { Product } from '../components/ProductCard';

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Valentine's Day");
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [under150Products, setUnder150Products] = useState<Product[]>([]);
  const [isLoadingUnder150, setIsLoadingUnder150] = useState(true);
  const navigate = useNavigate();

  const tabs = [
    "Valentine's Day",
    "Best Sellers",
    "Designer's Choice",
    "Weddings",
    "View All"
  ];

  // Fetch products based on active tab
  useEffect(() => {
    async function loadProductsByCategory() {
      // If "View All" is selected, don't fetch (will redirect)
      if (activeTab === "View All") {
        navigate('/shop');
        return;
      }

      try {
        setIsLoadingProducts(true);

        // Map tab names to possible database category names
        const categoryNameMap: { [key: string]: string[] } = {
          "Valentine's Day": ["Valentine's Day", "Valentine's day", "Valentines", "Valentine"],
          "Best Sellers": ["Best Sellers", "Best Seller", "Best sellers"],
          "Designer's Choice": ["Designer's Choice", "Designer Choice", "Designers Choice"],
          "Weddings": ["Weddings", "Wedding", "Wedding Arrangements"]
        };

        const possibleNames = categoryNameMap[activeTab] || [activeTab];

        // Try to find category by matching any of the possible names
        let category = null;

        // First, try exact match (case-insensitive)
        for (const name of possibleNames) {
          const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .ilike('name', name)
            .single();

          if (!error && data) {
            category = data;
            break;
          }
        }

        // If not found, try partial match
        if (!category) {
          for (const name of possibleNames) {
            const { data, error } = await supabase
              .from('categories')
              .select('id, name')
              .ilike('name', `%${name}%`)
              .single();

            if (!error && data) {
              category = data;
              break;
            }
          }
        }

        if (!category) {
          console.log(`Category "${activeTab}" not found, showing empty state`);
          setFeaturedProducts([]);
          setIsLoadingProducts(false);
          return;
        }

        const categoryId = category.id;

        // Get product IDs from product_categories using inner join
        const { data: productCategories, error: pcError } = await supabase
          .from('product_categories')
          .select('product_id')
          .eq('category_id', categoryId)
          .limit(8);

        if (pcError || !productCategories || productCategories.length === 0) {
          console.error('Error fetching product categories:', pcError);
          setFeaturedProducts([]);
          setIsLoadingProducts(false);
          return;
        }

        const productIds = productCategories.map(pc => pc.product_id);

        // Fetch products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds)
          .eq('in_stock', true)
          .limit(8);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          setFeaturedProducts([]);
        } else if (products) {
          setFeaturedProducts(products as Product[]);
        }

        setIsLoadingProducts(false);
      } catch (error) {
        console.error('Error loading products:', error);
        setFeaturedProducts([]);
        setIsLoadingProducts(false);
      }
    }

    loadProductsByCategory();
  }, [activeTab, navigate]);

  // Fetch products under $150
  useEffect(() => {
    async function loadUnder150Products() {
      try {
        setIsLoadingUnder150(true);
        console.log('🔍 Fetching products under $150...');
        
        // Fetch more products to account for filtering by effective price
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('in_stock', true)
          .order('price', { ascending: true })
          .limit(50); // Fetch more to filter by effective price

        if (error) {
          console.error('❌ Error fetching products under $150:', error);
          setUnder150Products([]);
        } else if (data) {
          console.log(`📦 Fetched ${data.length} products, filtering by effective price...`);
          
          // Filter by effective price (use sale_price if available and lower)
          // Ensure prices are parsed as numbers
          const filtered = data
            .map((product: any) => ({
              ...product,
              price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
              sale_price: product.sale_price 
                ? (typeof product.sale_price === 'string' ? parseFloat(product.sale_price) : product.sale_price)
                : null
            }))
            .filter((product: Product) => {
              const price = typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0;
              const salePrice = product.sale_price 
                ? (typeof product.sale_price === 'number' ? product.sale_price : parseFloat(String(product.sale_price)) || null)
                : null;
              
              const effectivePrice = salePrice !== null && salePrice < price ? salePrice : price;
              return effectivePrice <= 150;
            });
          
          console.log(`✅ Found ${filtered.length} products under $150`);
          setUnder150Products(filtered.slice(0, 8) as Product[]);
        } else {
          console.log('⚠️ No data returned from query');
          setUnder150Products([]);
        }
        setIsLoadingUnder150(false);
      } catch (error) {
        console.error('❌ Error loading products under $150:', error);
        setUnder150Products([]);
        setIsLoadingUnder150(false);
      }
    }

    loadUnder150Products();
  }, []);

  const handleTabClick = (tab: string) => {
    if (tab === "View All") {
      navigate('/shop');
    } else {
      setActiveTab(tab);
    }
  };

  const [customMinPrice, setCustomMinPrice] = useState("");
  const [customMaxPrice, setCustomMaxPrice] = useState("");

  const handlePriceNavigate = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    navigate(`/shop?${searchParams.toString()}`);
  };

  const handleCustomBudgetSearch = () => {
    const params = new URLSearchParams();
    const minValue = customMinPrice.trim();
    const maxValue = customMaxPrice.trim();

    if (minValue) {
      params.set("minPrice", minValue);
    }
    if (maxValue) {
      params.set("maxPrice", maxValue);
    }

    if ([...params.keys()].length === 0) {
      navigate("/shop");
      return;
    }

    navigate(`/shop?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[700px] w-full overflow-hidden">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1563241527-3004b7be0fee?auto=format&fit=crop&w=1920&q=80"
          alt="Luxury flower arrangement"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Centered Text Overlay */}
        <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
          <div className="max-w-4xl mx-auto">
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            >
              Nature's Finest, Hand-Picked for You
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-white/90 mb-10 font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
            >
              Experience the art of floral design.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 }}
            >
              <Link
                to="/shop"
                className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-stone-100 transition-all duration-300 hover:shadow-lg"
              >
                Shop Now
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three Main Features */}
      <section className="py-20 md:py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12">
            {/* Feature 1: Always Fresh */}
            <div className="text-center space-y-4">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <h3 
                className="text-2xl font-serif font-bold text-gray-800"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Always Fresh
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Sourced directly from local growers.
              </p>
            </div>

            {/* Feature 2: Same Day Delivery */}
            <div className="text-center space-y-4">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 
                className="text-2xl font-serif font-bold text-gray-800"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Same Day Delivery
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Order by 2PM for delivery today.
              </p>
            </div>

            {/* Feature 3: Handcrafted with Love */}
            <div className="text-center space-y-4">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <h3 
                className="text-2xl font-serif font-bold text-gray-800"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Handcrafted with Love
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Designed by expert florists.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products with Tabs */}
      <section className="py-20 md:py-32 px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <h2 
            className="text-4xl md:text-5xl font-serif font-bold text-gray-800 text-center mb-12"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Curated Collections
          </h2>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`px-6 py-3 font-serif text-sm uppercase tracking-wide transition-all duration-300 ${
                  activeTab === tab
                    ? 'text-gray-800 font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {isLoadingProducts ? (
            <div className="text-center py-16">
              <p className="text-gray-500 font-sans">Loading products...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 font-sans">No products available in this collection.</p>
            </div>
          )}
        </div>
      </section>

      {/* Shop by Price */}
      <section className="py-20 md:py-32 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-10"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Shop by Price
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <button
              type="button"
              onClick={() => handlePriceNavigate({ maxPrice: "75" })}
              className="border border-gray-200 rounded-2xl px-6 py-10 text-lg font-serif text-gray-800 hover:border-stone-400 hover:shadow-md transition-all duration-300"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Under $75
            </button>
            <button
              type="button"
              onClick={() => handlePriceNavigate({ minPrice: "76", maxPrice: "100" })}
              className="border border-gray-200 rounded-2xl px-6 py-10 text-lg font-serif text-gray-800 hover:border-stone-400 hover:shadow-md transition-all duration-300"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              $75 - $100
            </button>
            <button
              type="button"
              onClick={() => handlePriceNavigate({ minPrice: "101" })}
              className="border border-gray-200 rounded-2xl px-6 py-10 text-lg font-serif text-gray-800 hover:border-stone-400 hover:shadow-md transition-all duration-300"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Luxe &amp; Large (&gt; $100)
            </button>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 font-sans mb-4">
              Custom Budget
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Min $"
                value={customMinPrice}
                onChange={(event) => setCustomMinPrice(event.target.value)}
                className="w-full md:w-40 border border-gray-200 rounded-full px-4 py-3 text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
              <span className="text-gray-400">—</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Max $"
                value={customMaxPrice}
                onChange={(event) => setCustomMaxPrice(event.target.value)}
                className="w-full md:w-40 border border-gray-200 rounded-full px-4 py-3 text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
              <button
                type="button"
                onClick={handleCustomBudgetSearch}
                className="w-full md:w-auto px-6 py-3 rounded-full bg-stone-900 text-white text-sm uppercase tracking-wide font-semibold hover:bg-stone-800 transition-all duration-300"
              >
                Find Blooms →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Under $150 Section */}
      <section className="py-20 md:py-32 px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <h2 
              className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-4 md:mb-0"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Popular Picks
            </h2>
            {!isLoadingUnder150 && under150Products.length > 0 && (
              <Link
                to="/shop?maxPrice=150"
                className="px-6 py-3 text-sm font-semibold uppercase tracking-wide text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-700 transition-all duration-300 font-sans"
              >
                View All Under $150 →
              </Link>
            )}
          </div>

          {/* Products Grid */}
          {isLoadingUnder150 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 font-sans">Loading products...</p>
            </div>
          ) : under150Products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {under150Products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 font-sans">No products available in this price range.</p>
            </div>
          )}
        </div>
      </section>

      </main>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-6">
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

export default Home;
