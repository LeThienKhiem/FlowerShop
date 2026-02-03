import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Header from './Header';
import ProductSkeleton from './ProductSkeleton';
import FeaturedCategories from './FeaturedCategories';
import ProductCard, { Product as CatalogProduct } from './ProductCard';
import { supabase } from '../lib/supabase';

interface Product {
  id: number;
  name: string;
  originalPrice: number;
  salePrice: number;
  discountPercentage: number;
  imageUrl: string;
  aspectRatio: string; // Tailwind aspect ratio class
}

interface FeaturedCategory {
  id: string;
  name: string;
  slug?: string | null;
}

// Cache entry type with timestamp for TTL
type CacheEntry<T> = {
  data: T;
  timestamp: number; // Date.now()
};

// Cache duration: 2 minutes
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

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

const FloralShop: React.FC = () => {
  const [activeAboutTab, setActiveAboutTab] = useState('about');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [randomProducts, setRandomProducts] = useState<Product[]>([]);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [customMinPrice, setCustomMinPrice] = useState("");
  const [customMaxPrice, setCustomMaxPrice] = useState("");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 75 });
  const [activePricePreset, setActivePricePreset] = useState<'under75' | 'mid' | 'luxe' | 'custom'>('under75');
  const [priceProducts, setPriceProducts] = useState<CatalogProduct[]>([]);
  const [isLoadingPriceProducts, setIsLoadingPriceProducts] = useState(true);
  
  // Cache for storing fetched products by category with TTL
  const [productsCache, setProductsCache] = useState<Record<string, CacheEntry<Product[]>>>({});
  const [randomProductsCache, setRandomProductsCache] = useState<Record<string, CacheEntry<Product[]>>>({});
  
  // Featured Categories Tab System
  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategory[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  
  const teamMembers = [
    {
      id: 1,
      name: 'Sara Chan',
      role: 'Florist',
      imageUrl: 'https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/Founders/Sara_Chan.png'
    },
    {
      id: 2,
      name: 'Rosie Mendes',
      role: 'Florist',
      imageUrl: 'https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/Founders/Rosie_Mendes.png'
    },
    {
      id: 3,
      name: 'Nuha Aslam',
      role: 'Manager',
      imageUrl: 'https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/Founders/Nuha.png'
    },
    {
      id: 4,
      name: 'Nicky Nguyen',
      role: 'Owner / Director',
      imageUrl: 'https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/Founders/nicky_nguyen.png'
    }
  ];

  const handleCustomBudgetSearch = () => {
    const minValue = customMinPrice.trim();
    const maxValue = customMaxPrice.trim();
    const min = minValue ? Number(minValue) : 0;
    const max = maxValue ? Number(maxValue) : 10000;

    setActivePricePreset('custom');
    setPriceRange({ min: Number.isNaN(min) ? 0 : min, max: Number.isNaN(max) ? 10000 : max });
  };

  // Legacy hardcoded products (fallback if no featured products loaded)
  // Define this BEFORE useEffect so it's available
  const legacyProducts: Product[] = [
    {
      id: 1,
      name: 'Red Rose',
      originalPrice: 100,
      salePrice: 50,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1531058240690-006c446962d8?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[3/4]'
    },
    {
      id: 2,
      name: 'Yellow Tulip',
      originalPrice: 90,
      salePrice: 45,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1608656218680-e8be81ce71d7?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[4/3]'
    },
    {
      id: 3,
      name: 'Carnation',
      originalPrice: 76,
      salePrice: 38,
      discountPercentage: 50,
      imageUrl: 'https://plus.unsplash.com/premium_photo-1661767369944-56f410dd376f?q=80&w=1744&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[1/1]'
    },
    {
      id: 4,
      name: 'White Lily',
      originalPrice: 110,
      salePrice: 55,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1487070183336-b863922373d4?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[3/4]'
    },
    {
      id: 5,
      name: 'Sunflower',
      originalPrice: 84,
      salePrice: 42,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1488181665079-6c7f3b399bf4?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[4/3]'
    },
    {
      id: 6,
      name: 'White Daisy',
      originalPrice: 70,
      salePrice: 35,
      discountPercentage: 50,
      imageUrl: 'https://plus.unsplash.com/premium_photo-1676478746990-4ef5c8ef234a?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[1/1]'
    },
    {
      id: 7,
      name: 'Purple Orchid',
      originalPrice: 136,
      salePrice: 68,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1447875569765-2b3db822bec9?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[3/4]'
    },
    {
      id: 8,
      name: 'Pink Rose',
      originalPrice: 96,
      salePrice: 48,
      discountPercentage: 50,
      imageUrl: 'https://plus.unsplash.com/premium_photo-1676475964992-6404b8db0b53?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[4/3]'
    },
    {
      id: 9,
      name: 'Hydrangea',
      originalPrice: 104,
      salePrice: 52,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
      aspectRatio: 'aspect-[1/1]'
    },
    {
      id: 10,
      name: 'Peach Blossom',
      originalPrice: 78,
      salePrice: 39,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1615280825886-fa817c0a06cc?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[3/4]'
    },
    {
      id: 11,
      name: 'Lavender',
      originalPrice: 88,
      salePrice: 44,
      discountPercentage: 50,
      imageUrl: 'https://plus.unsplash.com/premium_photo-1673728254015-9a437bdb44aa?q=80&w=930&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[4/3]'
    },
    {
      id: 12,
      name: 'Lotus',
      originalPrice: 92,
      salePrice: 46,
      discountPercentage: 50,
      imageUrl: 'https://plus.unsplash.com/premium_photo-1695750536632-7e3055fc48d5?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D ',
      aspectRatio: 'aspect-[1/1]'
    },
    {
      id: 13,
      name: 'Pink Carnation',
      originalPrice: 80,
      salePrice: 40,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1653942808886-99985ca6c1f4?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[3/4]'
    },
    {
      id: 14,
      name: 'White Rose',
      originalPrice: 102,
      salePrice: 51,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1495231916356-a86217efff12?q=80&w=872&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[4/3]'
    },
    {
      id: 15,
      name: 'Yellow Daisy',
      originalPrice: 74,
      salePrice: 37,
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1531112998639-59af23e7a65e?q=80&w=782&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      aspectRatio: 'aspect-[1/1]'
    }
  ];


  // Fetch featured categories from Supabase
  useEffect(() => {
    async function loadFeaturedCategories() {
      try {
        setIsLoadingCategories(true);

        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_featured', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching featured categories:', error);
          setFeaturedCategories([]);
          setActiveTab(null);
        } else if (data && data.length > 0) {
          const categories = data as FeaturedCategory[];
          setFeaturedCategories(categories);
          setActiveTab(categories[0].id);
        } else {
          setFeaturedCategories([]);
          setActiveTab(null);
        }
      } catch (error) {
        console.error('Error loading featured categories:', error);
        setFeaturedCategories([]);
        setActiveTab(null);
      } finally {
        setIsLoadingCategories(false);
      }
    }

    loadFeaturedCategories();
  }, []);

  // Fisher-Yates shuffle function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch products for active featured category tab
  useEffect(() => {
    async function loadFeaturedProducts() {
      if (!activeTab) {
        setFeaturedProducts([]);
        setRandomProducts([]);
        setIsLoadingProducts(false);
        setIsLoadingMoreProducts(false);
        return;
      }

      // Check cache first - if data exists and is fresh, use it instantly (0ms delay)
      const cachedProductsEntry = productsCache[activeTab];
      const cachedRandomEntry = randomProductsCache[activeTab];
      
      const isProductsFresh = cachedProductsEntry && (Date.now() - cachedProductsEntry.timestamp < CACHE_DURATION);
      const isRandomFresh = cachedRandomEntry && (Date.now() - cachedRandomEntry.timestamp < CACHE_DURATION);
      
      if (isProductsFresh && isRandomFresh) {
        setFeaturedProducts(cachedProductsEntry.data || []);
        setRandomProducts(cachedRandomEntry.data || []);
        setIsLoadingProducts(false);
        setIsLoadingMoreProducts(false);
        return;
      }

      // If not cached, fetch from Supabase
      try {
        setIsLoadingProducts(true);

        // Correct Supabase syntax for Many-to-Many filter
        // Query from products and join with product_categories using !inner
        // The !inner ensures we only get products that have a matching product_categories entry
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, sale_price, images, in_stock, created_at, product_categories!inner(category_id)')
          .eq('product_categories.category_id', activeTab)
          .eq('in_stock', true)
          .order('created_at', { ascending: false })
          .limit(12);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          throw productsError;
        }

        if (productsData && productsData.length > 0) {
          // Transform Supabase data to Product format
          const transformedProducts: Product[] = productsData.map((product: any) => {
            const discountPercentage = product.price && product.sale_price && product.price > product.sale_price
              ? Math.round(((product.price - product.sale_price) / product.price) * 100)
              : 0;

            return {
              id: product.id,
              name: product.name,
              originalPrice: product.price,
              salePrice: product.sale_price || product.price,
              discountPercentage,
              imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
              aspectRatio: 'aspect-square'
            };
          });

          setFeaturedProducts(transformedProducts);
          
          // Save to cache with timestamp
          setProductsCache(prev => ({ 
            ...prev, 
            [activeTab]: { data: transformedProducts, timestamp: Date.now() } 
          }));

          // Step 2: Extract IDs of featured products
          const excludedIds = transformedProducts.map(p => p.id);

          // Step 3: Fetch more products excluding featured ones
          setIsLoadingMoreProducts(true);
          
          // Fetch more products and filter out featured ones client-side if needed
          // Using a simpler approach: fetch all in-stock products and filter client-side
          const { data: allProductsData, error: moreProductsError } = await supabase
            .from('products')
            .select('id, name, price, sale_price, images, in_stock')
            .eq('in_stock', true)
            .limit(50);
          
          let moreProductsData = allProductsData;
          
          // Filter out featured products client-side
          if (allProductsData && excludedIds.length > 0) {
            moreProductsData = allProductsData.filter((product: any) => !excludedIds.includes(product.id));
          }

          if (moreProductsError) {
            console.error('Error fetching more products:', moreProductsError);
            setRandomProducts([]);
            setRandomProductsCache(prev => ({ 
              ...prev, 
              [activeTab]: { data: [] as Product[], timestamp: Date.now() } 
            }));
          } else if (moreProductsData && moreProductsData.length > 0) {
            // Transform and shuffle
            const transformedMoreProducts: Product[] = moreProductsData.map((product: any) => {
              const discountPercentage = product.price && product.sale_price && product.price > product.sale_price
                ? Math.round(((product.price - product.sale_price) / product.price) * 100)
                : 0;

              return {
                id: product.id,
                name: product.name,
                originalPrice: product.price,
                salePrice: product.sale_price || product.price,
                discountPercentage,
                imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
                aspectRatio: 'aspect-square'
              };
            });

            // Step 4: Shuffle and take 8
            const shuffled = shuffleArray(transformedMoreProducts);
            const randomProductsResult = shuffled.slice(0, 8);
            setRandomProducts(randomProductsResult);
            
            // Save to cache with timestamp
            setRandomProductsCache(prev => ({ 
              ...prev, 
              [activeTab]: { data: randomProductsResult, timestamp: Date.now() } 
            }));
          } else {
            setRandomProducts([]);
            setRandomProductsCache(prev => ({ 
              ...prev, 
              [activeTab]: { data: [] as Product[], timestamp: Date.now() } 
            }));
          }
          setIsLoadingMoreProducts(false);
        } else {
          setFeaturedProducts([]);
          setRandomProducts([]);
          // Cache empty results with timestamp to prevent refetching (until expiry)
          setProductsCache(prev => ({ 
            ...prev, 
            [activeTab]: { data: [] as Product[], timestamp: Date.now() } 
          }));
          setRandomProductsCache(prev => ({ 
            ...prev, 
            [activeTab]: { data: [] as Product[], timestamp: Date.now() }
          }));
        }
      } catch (error) {
        console.error('Error loading featured products:', error);
        setFeaturedProducts([]);
        setRandomProducts([]);
        // Cache empty results on error to prevent refetching (until expiry)
        setProductsCache(prev => ({ 
          ...prev, 
          [activeTab]: { data: [] as Product[], timestamp: Date.now() } 
        }));
        setRandomProductsCache(prev => ({ 
          ...prev, 
          [activeTab]: { data: [] as Product[], timestamp: Date.now() }
        }));
      } finally {
        setIsLoadingProducts(false);
        setIsLoadingMoreProducts(false);
      }
    }

    loadFeaturedProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    async function loadPriceProducts() {
      try {
        setIsLoadingPriceProducts(true);
        let query = supabase
          .from('products')
          .select('*')
          .gte('price', priceRange.min);

        if (priceRange.max < 10000) {
          query = query.lte('price', priceRange.max);
        }

        const { data, error } = await query.limit(8);

        if (error) {
          console.error('Error fetching products by price range:', error);
          setPriceProducts([]);
        } else if (data) {
          setPriceProducts(data as CatalogProduct[]);
        } else {
          setPriceProducts([]);
        }
      } catch (error) {
        console.error('Error loading price products:', error);
        setPriceProducts([]);
      } finally {
        setIsLoadingPriceProducts(false);
      }
    }

    loadPriceProducts();
  }, [priceRange.min, priceRange.max]);
  

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
      <div className="overflow-x-hidden">
      {/* SECTION 1: Hero Banner */}
      <section className="hero relative h-[500px] w-full overflow-hidden">
        {/* Background Image */}
        <img
          src="https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/images/bannerhero.avif"
          alt="Hero Banner"
          className="absolute inset-0 w-full h-full object-cover animate-[zoomOut_3s_ease-out_forwards]"
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }}></div>
        
        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-center text-center">
          <div>
            <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-4">
              <p className="hero-intro text-white" style={{ fontFamily: "'Mollani-Regular', sans-serif" }}>
                Welcome to
              </p>
              <h1 className="text-6xl md:text-7xl text-white mb-4" style={{ fontFamily: "'Mollani-Regular', sans-serif" }}>
                Magnolia
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-white mb-8 font-light">
              Art of Floral Design
            </p>
            <Link to="/shop" className="btn-order px-8 py-3 text-white font-medium inline-block">
              Order flowers
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2: Selling Points */}
      <section className="pt-16 md:pt-24 pb-8 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Item 1: Same Day Delivery */}
            <div className="feature-item text-center">
              <div className="mb-6 flex justify-center">
                <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 font-sans">
                SAME DAY DELIVERY
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Apply for orders placed before 2pm. After the cut off time, please call <a href="tel:+61398773164" className="text-gray-900 hover:underline">(03) 9877 3164</a>.
              </p>
            </div>

            {/* Item 2: Daily Fresh Markets */}
            <div className="feature-item text-center">
              <div className="mb-6 flex justify-center">
                <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 font-sans">
                DAILY FRESH MARKETS
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                Brighten up your day with fresh local and imported flowers arrived daily.
              </p>
            </div>

            {/* Item 3: Emotion Creator */}
            <div className="feature-item text-center">
              <div className="mb-6 flex justify-center">
                <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 font-sans">
                EMOTION CREATOR
              </h3>
              <p className="text-gray-600 leading-relaxed font-sans">
                We are not just making bouquets, We are creating emotions for all life's occasions.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* SECTION 4: Featured Categories Tab System */}
      <section className="max-w-[1400px] mx-auto px-6 pt-4 pb-16 relative">
        {/* Fixed Category Bar - Always in DOM, never conditionally rendered */}
        <FeaturedCategories
          categories={featuredCategories}
          selectedCategory={activeTab}
          onCategoryChange={setActiveTab}
          isLoading={isLoadingCategories}
        />
        
        {/* Content Area - Stable container */}
        <div className="min-h-screen w-full" style={{ overflowAnchor: 'none' }}>
          {!isLoadingCategories && featuredCategories.length > 0 ? (
            <>
              {isLoadingProducts ? (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 transition-opacity duration-300">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductSkeleton key={`skeleton-${i}`} />
                  ))}
                </div>
              ) : featuredProducts.length > 0 ? (
                <FadeIn className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 transition-opacity duration-300">
                  {featuredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      className="break-inside-avoid"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-100px' }}
                      transition={{ duration: 0.6, delay: index * 0.08 }}
                    >
                      <div className="product-card group mb-4 bg-white p-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        {/* Product Image */}
                        <Link to={`/product/${product.id}`}>
                          <div className="product-image-wrapper w-full overflow-hidden rounded-lg mb-4">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        </Link>
                        
                        {/* Product Info */}
                        <div className="text-black">
                          <h3 className="text-lg font-medium mb-2 font-sans">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {product.originalPrice > product.salePrice && (
                              <div className="flex items-center gap-2">
                                <del className="text-sm text-gray-500 font-sans">
                                  ${product.originalPrice.toFixed(2)}
                                </del>
                              </div>
                            )}
                            <span className="text-lg font-bold text-[#6B8E23] font-sans">
                              ${product.salePrice.toFixed(2)}
                            </span>
                            {product.discountPercentage > 0 && (
                              <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded font-sans">
                                -{product.discountPercentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </FadeIn>
              ) : (
                <div className="flex items-center justify-center min-h-[50vh]">
                  <p className="text-gray-500 font-sans">No products found in this category yet.</p>
                </div>
              )}
              
              {/* Explore Button */}
              {activeTab && !isLoadingProducts && featuredProducts.length > 0 && (
                <div className="text-center mt-12">
                  {(() => {
                    const activeCategory = featuredCategories.find(cat => cat.id === activeTab);
                    if (!activeCategory) return null;
                    
                    const getCategorySlug = (category: FeaturedCategory): string => {
                      if (category.slug) return category.slug;
                      return category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
                    };
                    
                    const categorySlug = getCategorySlug(activeCategory);
                    
                    return (
                      <Link
                        to={`/category/${categorySlug}`}
                        className="inline-block border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-300 rounded-full px-8 py-3 uppercase tracking-widest text-sm font-medium"
                      >
                        Explore {activeCategory.name} Collection
                      </Link>
                    );
                  })()}
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>

      {/* Shop by Price */}
      <section className="max-w-[1400px] mx-auto px-6 py-16 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-10"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Shop by Price
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <button
              type="button"
              onClick={() => {
                setActivePricePreset('under75');
                setPriceRange({ min: 0, max: 75 });
              }}
              className={`rounded-2xl px-6 py-10 text-lg font-serif transition-all duration-300 ${
                activePricePreset === 'under75'
                  ? 'bg-stone-900 text-white shadow-md'
                  : 'border border-gray-200 text-gray-800 hover:border-stone-400 hover:shadow-md'
              }`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Under $75
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePricePreset('mid');
                setPriceRange({ min: 76, max: 100 });
              }}
              className={`rounded-2xl px-6 py-10 text-lg font-serif transition-all duration-300 ${
                activePricePreset === 'mid'
                  ? 'bg-stone-900 text-white shadow-md'
                  : 'border border-gray-200 text-gray-800 hover:border-stone-400 hover:shadow-md'
              }`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              $75 - $100
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePricePreset('luxe');
                setPriceRange({ min: 101, max: 10000 });
              }}
              className={`rounded-2xl px-6 py-10 text-lg font-serif transition-all duration-300 ${
                activePricePreset === 'luxe'
                  ? 'bg-stone-900 text-white shadow-md'
                  : 'border border-gray-200 text-gray-800 hover:border-stone-400 hover:shadow-md'
              }`}
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

          <div className="mt-12">
            {isLoadingPriceProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductSkeleton key={`price-skeleton-${index}`} />
                ))}
              </div>
            ) : priceProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {priceProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 font-sans">No products found.</p>
              </div>
            )}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              to={`/shop?minPrice=${priceRange.min}&maxPrice=${priceRange.max}`}
              className="inline-flex items-center gap-2 border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-300 rounded-full px-8 py-3 uppercase tracking-widest text-sm font-medium"
            >
              Explore All Matches →
            </Link>
          </div>
        </div>
      </section>

      {/* More Blooms to Explore Section */}
      {!isLoadingCategories && (
        <section className="max-w-[1400px] mx-auto px-6 py-16">
          <h2 className="text-3xl font-serif text-center mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
            More Blooms to Explore
          </h2>
          {isLoadingMoreProducts ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 min-h-[600px] transition-opacity duration-300">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={`more-skeleton-${i}`} />
              ))}
            </div>
          ) : randomProducts.length > 0 ? (
            <>
              <FadeIn className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 transition-opacity duration-300">
                {randomProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    className="break-inside-avoid"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                  >
                    <div className="product-card group mb-4 bg-white p-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      {/* Product Image */}
                      <Link to={`/product/${product.id}`}>
                        <div className="product-image-wrapper w-full overflow-hidden rounded-lg mb-4">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      </Link>
                      
                      {/* Product Info */}
                      <div className="text-black">
                        <h3 className="text-lg font-medium mb-2 font-sans">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {product.originalPrice > product.salePrice && (
                            <div className="flex items-center gap-2">
                              <del className="text-sm text-gray-500 font-sans">
                                ${product.originalPrice.toFixed(2)}
                              </del>
                            </div>
                          )}
                          <span className="text-lg font-bold text-[#6B8E23] font-sans">
                            ${product.salePrice.toFixed(2)}
                          </span>
                          {product.discountPercentage > 0 && (
                            <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded font-sans">
                              -{product.discountPercentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </FadeIn>
              
              {/* View All Products Button */}
              <FadeIn className="flex justify-center mt-10">
                <Link
                  to="/shop"
                  className="inline-block border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white transition-all duration-300 rounded-full px-8 py-3 uppercase tracking-widest text-sm font-medium"
                >
                  View All Products
                </Link>
              </FadeIn>
            </>
          ) : null}
        </section>
      )}

      {/* Legacy hardcoded products section (hidden, kept for reference) */}
      <section className="hidden">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {legacyProducts.map((product) => (
            <div
              key={product.id}
              className="product-card group break-inside-avoid mb-8 bg-white p-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Product Image */}
              <div className={`product-image-wrapper ${product.aspectRatio} w-full overflow-hidden rounded-lg mb-4`}>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              
              {/* Product Info */}
              <div className="text-black">
                <h3 className="text-lg font-medium mb-2 font-sans">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {product.originalPrice > product.salePrice && (
                    <div className="flex items-center gap-2">
                      <del className="text-sm text-gray-500 font-sans">
                        ${product.originalPrice.toFixed(2)}
                      </del>
                    </div>
                  )}
                  <span className="text-lg font-bold text-[#6B8E23] font-sans">
                    ${product.salePrice.toFixed(2)}
                  </span>
                  {product.discountPercentage > 0 && (
                    <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded font-sans">
                      -{product.discountPercentage}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: About Us */}
      <section id="about" className="py-16 md:py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Intro Text */}
          <FadeIn>
            <p className="text-center text-lg md:text-xl text-gray-700 mb-12 font-serif max-w-3xl mx-auto leading-relaxed md:whitespace-nowrap" style={{ fontFamily: "'Playfair Display', serif" }}>
              Magnolia Florist is committed to offering only the finest floral arrangements and gifts...
            </p>
          </FadeIn>

          {/* Tabs */}
          <FadeIn className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
            <button
              onClick={() => setActiveAboutTab('about')}
              className={`px-6 py-2 text-base font-medium transition-all ${
                activeAboutTab === 'about'
                  ? 'text-[#6B8E23] border-b-2 border-[#6B8E23]'
                  : 'text-gray-600 hover:text-gray-900'
              } font-serif`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              ABOUT MAGNOLIA FLORIST
            </button>
            <button
              onClick={() => setActiveAboutTab('hours')}
              className={`px-6 py-2 text-base font-medium transition-all ${
                activeAboutTab === 'hours'
                  ? 'text-[#6B8E23] border-b-2 border-[#6B8E23]'
                  : 'text-gray-600 hover:text-gray-900'
              } font-serif`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              STORE HOURS
            </button>
            <button
              onClick={() => setActiveAboutTab('services')}
              className={`px-6 py-2 text-base font-medium transition-all ${
                activeAboutTab === 'services'
                  ? 'text-[#6B8E23] border-b-2 border-[#6B8E23]'
                  : 'text-gray-600 hover:text-gray-900'
              } font-serif`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              SPECIALTY SERVICES
            </button>
          </FadeIn>

          {/* Tab Content */}
          <FadeIn className="mb-16">
            {activeAboutTab === 'about' && (
              <div className="text-center text-gray-700 font-sans">
                <p className="max-w-2xl mx-auto leading-relaxed">
                  Magnolia Florist has been serving the community with beautiful floral arrangements for years. 
                  We pride ourselves on quality, creativity, and exceptional customer service.
                </p>
              </div>
            )}
            {activeAboutTab === 'hours' && (
              <div className="text-center text-gray-700 font-sans">
                <p className="max-w-2xl mx-auto leading-relaxed">
                  Monday - Saturday: 9:00 AM - 6:30 PM<br />
                  Sunday: 10:30 AM - 6:00 PM
                </p>
              </div>
            )}
            {activeAboutTab === 'services' && (
              <div className="text-center text-gray-700 font-sans">
                <p className="max-w-2xl mx-auto leading-relaxed">
                  We offer wedding arrangements, corporate events, sympathy flowers, 
                  daily fresh bouquets, and custom floral designs tailored to your needs.
                </p>
              </div>
            )}
          </FadeIn>

          {/* Team Section */}
          <FadeIn className="bg-[#FFF5EE] py-16 px-6 rounded-lg">
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              OUR TEAM
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  className="text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                >
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                    <img
                      src={member.imageUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-lg font-bold mb-1 font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {member.name}
                  </h4>
                  <p className="text-gray-600 mb-3 font-sans">{member.role}</p>
                  <div className="flex justify-center gap-3">
                    <a href="#" className="text-gray-600 hover:text-[#6B8E23] transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-600 hover:text-[#6B8E23] transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-600 hover:text-[#6B8E23] transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      </div>
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

export default FloralShop;

