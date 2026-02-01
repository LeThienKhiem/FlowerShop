import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import ProductCard, { Product } from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import { ChevronDown, ListFilter, Check } from 'lucide-react';

// Lazy load rc-slider - only load when filter dropdown is opened
const Slider = lazy(() => import('rc-slider').then(module => ({ default: module.default })));

// Dynamically import CSS when slider is needed
let sliderCssLoaded = false;
const loadSliderCSS = () => {
  if (!sliderCssLoaded) {
    import('rc-slider/assets/index.css');
    sliderCssLoaded = true;
  }
};

interface Category {
  id: string;
  name: string;
  slug: string | null;
  display_order: number | null;
  show_on_home?: boolean | null;
  /** Shop dropdown priority: when true, category appears at top of Shop filter (Admin "Feature on Shop" / is_featured) */
  is_featured?: boolean | null;
}

/** Product with category relations for filtering */
type ProductWithCategories = Product & {
  product_categories?: { category_id: string }[];
  categories?: { id: string; name: string }[];
};

const Shop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const maxPriceParam = searchParams.get('maxPrice');
  const minPriceParam = searchParams.get('minPrice');

  /** Multi-select category filter: category IDs. Empty = show all. */
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithCategories[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const hasAppliedUrlCategoryRef = useRef(false);
  
  // Price range filter state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number] | null>(null);
  
  // Initialize price filter from URL parameter
  useEffect(() => {
    if (maxPriceParam || minPriceParam) {
      const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : null;
      const minPrice = minPriceParam ? parseFloat(minPriceParam) : 0;
      if ((maxPrice && !isNaN(maxPrice) && maxPrice > 0) || (minPriceParam && !isNaN(minPrice) && minPrice >= 0)) {
        const newMin = minPrice || 0;
        const newMax = maxPrice ?? maxProductPrice;
        if (!appliedPriceRange || appliedPriceRange[0] !== newMin || appliedPriceRange[1] !== newMax) {
          setPriceRange([newMin, newMax]);
          setAppliedPriceRange([newMin, newMax]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPriceParam, minPriceParam]);
  
  // Calculate max price dynamically from products
  const maxProductPrice = useMemo(() => {
    if (allProducts.length === 0) return 500;
    const prices = allProducts.map(p => p.sale_price && p.sale_price < p.price ? p.sale_price : p.price);
    const max = Math.max(...prices);
    // Round up to nearest 50 for cleaner slider max
    return Math.ceil(max / 50) * 50 || 500;
  }, [allProducts]);

  // Fetch all categories (include is_featured for Shop dropdown "Feature on Shop" sort priority)
  useEffect(() => {
    async function loadAllCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, display_order, show_on_home, is_featured')
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
        } else if (data) {
          setAllCategories(data as Category[]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    }

    loadAllCategories();
  }, []);

  // Deep link: set selectedCategories from URL (?category=Valentine's Day) as soon as we have categories.
  // Apply once per mount so filtering runs on the same/next render with products.
  const categoryParam = searchParams.get('category');
  useEffect(() => {
    if (hasAppliedUrlCategoryRef.current || !categoryParam || allCategories.length === 0) return;
    const decodedCategory = decodeURIComponent(categoryParam).trim();
    const category = allCategories.find(
      (cat) =>
        cat.name === decodedCategory ||
        cat.name.toLowerCase() === decodedCategory.toLowerCase()
    );
    if (category) {
      hasAppliedUrlCategoryRef.current = true;
      setSelectedCategories([category.id]); // Replace selection with URL category so list filters immediately
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('category');
        return next;
      });
    }
  }, [categoryParam, allCategories, setSearchParams]);

  // Fetch all products with category relations for filtering
  useEffect(() => {
    async function loadAllProducts() {
      try {
        setIsLoadingProducts(true);
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            sale_price,
            images,
            description,
            in_stock,
            created_at,
            category:categories!inner(
              id,
              name,
              slug
            ),
            product_categories(
              category_id,
              categories(
                id,
                name,
                slug
              )
            )
          `)
          .eq('in_stock', true);

        if (sortOrder === 'asc') {
          query = query.order('price', { ascending: true });
        } else if (sortOrder === 'desc') {
          query = query.order('price', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query.limit(200);

        if (error) {
          console.error('Error fetching all products:', error);
          setAllProducts([]);
        } else if (data) {
          const transformedProducts: ProductWithCategories[] = (data as any[]).map((product) => {
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

            return {
              ...product,
              categories,
              category: product.category ?? categories[0] ?? null,
            };
          });

          setAllProducts(transformedProducts);
        }
      } catch (error) {
        console.error('Error loading all products:', error);
        setAllProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadAllProducts();
  }, [sortOrder]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSortChange = (newSortOrder: 'default' | 'asc' | 'desc') => {
    setSortOrder(newSortOrder);
    setIsSortOpen(false);
  };

  // Apply price filter (triggered when user stops dragging)
  const handlePriceRangeChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      setPriceRange([values[0], values[1]]);
    }
  };

  // Apply filter when user finishes dragging
  const handlePriceRangeAfterChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      setAppliedPriceRange([values[0], values[1]]);
    }
  };

  // Reset price filter
  const handleResetPriceFilter = () => {
    const resetRange: [number, number] = [0, maxProductPrice];
    setPriceRange(resetRange);
    setAppliedPriceRange(null);
  };
  
  // Update price range max when products load (only if not manually set)
  useEffect(() => {
    if (maxProductPrice > 500 && priceRange[1] === 500 && !appliedPriceRange) {
      setPriceRange([priceRange[0], maxProductPrice]);
    }
  }, [maxProductPrice, appliedPriceRange]);

  // Filter products: category (multi-select) + price range
  const getFilteredProducts = (): ProductWithCategories[] => {
    let filtered = [...allProducts];

    // Category filter: show all if none selected; else show products in selected categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => {
        const categoryIds = product.product_categories?.map((pc) => pc.category_id) ?? [];
        return categoryIds.some((id) => selectedCategories.includes(id));
      });
    }

    // Price filter
    if (appliedPriceRange !== null) {
      const [min, max] = appliedPriceRange;
      filtered = filtered.filter((product) => {
        const price = product.sale_price && product.sale_price < product.price
          ? product.sale_price
          : product.price;
        return price >= min && price <= max;
      });
    }

    return filtered;
  };

  // Get current sort label
  const getSortLabel = () => {
    switch (sortOrder) {
      case 'asc':
        return 'Price: Low to High';
      case 'desc':
        return 'Price: High to Low';
      default:
        return 'Default';
    }
  };

  // Get filter & sort button label
  const getFilterSortLabel = () => {
    const hasFilter = appliedPriceRange !== null;
    const sortLabel = getSortLabel();
    if (hasFilter) {
      return `Filter & Sort (Active)`;
    }
    return `Filter & Sort: ${sortLabel}`;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setIsSortOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Product list depends on selectedCategories so deep link filters correctly
  const filteredProducts = useMemo(() => getFilteredProducts(), [
    allProducts,
    selectedCategories,
    appliedPriceRange,
  ]);
  const hasCategoryFilter = selectedCategories.length > 0;
  const categoryFilterLabel = hasCategoryFilter
    ? `Categories (${selectedCategories.length})`
    : 'Categories';

  // Categories for dropdown: load ALL categories. Sort: show_on_home (Feature on Shop) first, then selected, then alphabetical.
  const categoriesForDropdown = useMemo(() => {
    const hasSearch = categorySearch.trim().length > 0;
    const q = hasSearch ? categorySearch.trim().toLowerCase() : '';
    const filtered = hasSearch
      ? allCategories.filter((c) => c.name.toLowerCase().includes(q))
      : [...allCategories];
    const sorted = filtered.sort((a, b) => {
      // Priority 1: Feature on Shop (show_on_home) at top – Admin "Feature on Shop" toggle
      if (a.show_on_home && !b.show_on_home) return -1;
      if (!a.show_on_home && b.show_on_home) return 1;
      // Priority 2: Selected categories next
      const aSelected = selectedCategories.includes(a.id);
      const bSelected = selectedCategories.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      // Priority 3: Alphabetical
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted;
  }, [allCategories, selectedCategories, categorySearch]);

  const getPageTitle = (): string => {
    if (selectedCategories.length === 0) return 'All Blooms';
    if (selectedCategories.length === 1) {
      const cat = allCategories.find((c) => c.id === selectedCategories[0]);
      return cat ? cat.name : 'All Blooms';
    }
    return 'Your Selected Blooms';
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="py-16 px-6 flex-1">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <h1 
            className="text-4xl md:text-5xl font-serif font-bold text-gray-800 text-center mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Shop All Products
          </h1>

          {/* Sticky Toolbar: Filter Categories + Filter & Sort */}
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 px-4 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all mb-6">
            {/* Left: Filter Categories dropdown */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen((o) => !o)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium min-h-[44px] touch-manipulation"
                aria-expanded={isCategoryDropdownOpen}
                aria-haspopup="listbox"
                aria-label={categoryFilterLabel}
              >
                <span>{categoryFilterLabel}</span>
                <ChevronDown
                  size={18}
                  className={`text-gray-500 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isCategoryDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-72 max-h-[70vh] overflow-hidden flex flex-col bg-white rounded-xl shadow-xl border border-gray-100 z-50"
                  role="listbox"
                  aria-multiselectable
                >
                  <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-sm font-semibold text-stone-900 font-sans">Categories</h3>
                  </div>
                  <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
                    <input
                      type="search"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none font-sans"
                      aria-label="Search categories"
                    />
                  </div>
                  <div className="py-1 overflow-y-auto max-h-[300px] min-h-0">
                    {categoriesForDropdown.map((cat) => {
                      const isChecked = selectedCategories.includes(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCategoryToggle(cat.id)}
                            className="w-5 h-5 rounded border-gray-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-800 font-sans">{cat.name}</span>
                        </label>
                      );
                    })}
                    {categoriesForDropdown.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-500 font-sans">No categories match your search.</p>
                    )}
                  </div>
                  {hasCategoryFilter && (
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setSelectedCategories([])}
                        className="text-sm text-stone-600 hover:text-stone-900 font-medium underline"
                      >
                        Clear categories
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Filter & Sort Dropdown */}
            <div className="relative ml-4" ref={sortDropdownRef}>
              {/* Trigger Button */}
              <button
                onClick={() => {
                  setIsSortOpen(!isSortOpen);
                  if (!isSortOpen) {
                    loadSliderCSS(); // Load CSS when dropdown opens
                  }
                }}
                className="flex items-center justify-center gap-2 p-2 aspect-square rounded-full md:px-4 md:py-2 md:w-auto md:aspect-auto md:rounded-full bg-stone-100 hover:bg-stone-900 hover:text-white transition-all duration-300 cursor-pointer group"
              >
                <ListFilter size={16} className="text-gray-700 group-hover:text-white transition-colors" />
                <span className="hidden md:block text-sm font-medium text-gray-700 group-hover:text-white transition-colors">
                  {getFilterSortLabel()}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`hidden md:block text-gray-700 group-hover:text-white transition-all duration-300 ${isSortOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isSortOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in z-50">
                  {/* Sort By Section */}
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-stone-900 mb-3 font-sans">Sort By</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => handleSortChange('default')}
                        className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 rounded-lg transition-colors flex items-center justify-between ${
                          sortOrder === 'default' ? 'font-semibold bg-stone-50' : ''
                        }`}
                      >
                        <span>Default</span>
                        {sortOrder === 'default' && <Check size={16} className="text-stone-900" />}
                      </button>
                      <button
                        onClick={() => handleSortChange('asc')}
                        className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 rounded-lg transition-colors flex items-center justify-between ${
                          sortOrder === 'asc' ? 'font-semibold bg-stone-50' : ''
                        }`}
                      >
                        <span>Price: Low to High</span>
                        {sortOrder === 'asc' && <Check size={16} className="text-stone-900" />}
                      </button>
                      <button
                        onClick={() => handleSortChange('desc')}
                        className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 rounded-lg transition-colors flex items-center justify-between ${
                          sortOrder === 'desc' ? 'font-semibold bg-stone-50' : ''
                        }`}
                      >
                        <span>Price: High to Low</span>
                        {sortOrder === 'desc' && <Check size={16} className="text-stone-900" />}
                      </button>
                    </div>
                  </div>

                  {/* Price Range Section */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-stone-900 mb-4 font-sans">Price Range</h3>
                    
                    <div className="space-y-4">
                      {/* Display current range */}
                      <div className="text-center">
                        <div className="text-base font-semibold text-stone-900 font-sans">
                          ${priceRange[0].toFixed(0)} - ${priceRange[1].toFixed(0)}
                        </div>
                        {appliedPriceRange && (
                          <div className="text-xs text-stone-600 mt-1 font-sans">
                            Filter active
                          </div>
                        )}
                      </div>
                      
                      {/* Range Slider - Lazy loaded */}
                      <div className="px-2 py-2">
                        <Suspense fallback={<div className="h-8 bg-gray-200 rounded animate-pulse" />}>
                          <Slider
                            range
                            min={0}
                            max={maxProductPrice}
                            step={5}
                            value={priceRange}
                            onChange={handlePriceRangeChange}
                            onAfterChange={handlePriceRangeAfterChange}
                            className="price-range-slider"
                          />
                        </Suspense>
                      </div>
                      
                      {/* Reset button */}
                      {appliedPriceRange && (
                        <button
                          onClick={handleResetPriceFilter}
                          className="w-full px-4 py-2 text-stone-600 hover:text-stone-900 text-sm font-medium transition-colors font-sans underline"
                        >
                          Reset Price Filter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Product grid (filtered by categories + price) */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-800 text-center mb-8">
          {getPageTitle()}
        </h2>

        {(hasCategoryFilter || appliedPriceRange) && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 font-sans">
              Showing {filteredProducts.length} of {allProducts.length} products
            </p>
          </div>
        )}

        {isLoadingProducts ? (
          <div className="flex flex-wrap justify-center gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="w-full sm:w-[300px]"
              >
                <ProductSkeleton />
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-6">
            {filteredProducts.map((product) => (
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
            <p className="text-gray-500 font-sans mb-2">No products match your filter criteria.</p>
            <div className="flex flex-wrap justify-center gap-4">
              {hasCategoryFilter && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-stone-600 hover:text-stone-900 text-sm font-medium underline font-sans"
                >
                  Clear categories
                </button>
              )}
              {appliedPriceRange && (
                <button
                  onClick={handleResetPriceFilter}
                  className="text-stone-600 hover:text-stone-900 text-sm font-medium underline font-sans"
                >
                  Reset price filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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

export default Shop;
