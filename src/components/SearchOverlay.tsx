import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Fuse, { IFuseOptions } from 'fuse.js';

interface SearchProduct {
  id: number | string;
  name: string;
  price: number;
  sale_price?: number | null;
  images?: string[] | null;
  description?: string | null;
  category_name?: string | null;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [fuse, setFuse] = useState<Fuse<SearchProduct> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all products once when overlay opens
  useEffect(() => {
    if (isOpen && allProducts.length === 0 && !isLoadingProducts) {
      async function loadAllProducts() {
        setIsLoadingProducts(true);
        try {
          // Fetch all active products (simplified - categories can be added later if needed)
          const { data, error } = await supabase
            .from('products')
            .select('id, name, price, sale_price, images, description')
            .eq('in_stock', true);

          if (error) {
            console.error('Error fetching products:', error);
            setAllProducts([]);
          } else if (data) {
            // Add category_name as null for now (can be enhanced later with joins)
            const products = data.map((p: any) => ({
              ...p,
              category_name: null,
            }));
            setAllProducts(products);
          }
        } catch (error) {
          console.error('Error loading products:', error);
          setAllProducts([]);
        } finally {
          setIsLoadingProducts(false);
        }
      }

      loadAllProducts();
    }
  }, [isOpen, allProducts.length, isLoadingProducts]);

  // Initialize Fuse when products are loaded
  useEffect(() => {
    if (allProducts.length > 0 && !fuse) {
      const options: IFuseOptions<SearchProduct> = {
        includeScore: true,
        keys: [
          { name: 'name', weight: 0.7 },        // High priority for Name
          { name: 'category_name', weight: 0.2 }, // Medium priority for Category (if available)
          { name: 'description', weight: 0.1 }  // Low priority for Description
        ],
        threshold: 0.4, // 0.0 is perfect match, 1.0 is match anything. 0.3-0.4 is good for "fuzzy".
        ignoreLocation: true, // Matches "mother" and "day" anywhere in the string
        minMatchCharLength: 2, // Minimum character length to match
      };

      const fuseInstance = new Fuse(allProducts, options);
      setFuse(fuseInstance);
    }
  }, [allProducts, fuse]);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure smooth animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset query when closing
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Fuzzy search using Fuse.js
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if query is empty or Fuse is not initialized
    if (!query.trim() || !fuse) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Set loading state
    setLoading(true);

    // Debounce the search (smaller delay since it's client-side now)
    debounceTimerRef.current = setTimeout(() => {
      try {
        const searchResults = fuse.search(query);
        // Extract items from Fuse results and limit to 20
        const items = searchResults
          .slice(0, 20)
          .map((result) => result.item);
        setResults(items);
      } catch (error) {
        console.error('Error in fuzzy search:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150); // Reduced debounce since it's instant client-side search

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fuse]);

  // Handle result click
  const handleResultClick = (product: SearchProduct) => {
    // Route uses id parameter
    const productLink = `/product/${String(product.id)}`;
    
    onClose();
    navigate(productLink);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayPrice = (product: SearchProduct) => {
    return product.sale_price && product.sale_price < product.price
      ? product.sale_price
      : product.price;
  };

  const imageUrl = (product: SearchProduct) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    return 'https://via.placeholder.com/100x100?text=No+Image';
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Area */}
        <div className="border-b border-gray-200">
          <div className="flex items-center px-6 py-4">
            <Search className="w-6 h-6 text-gray-400 mr-4" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for flowers, bouquets, arrangements..."
              className="text-2xl p-2 w-full outline-none font-serif placeholder:text-gray-300 flex-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            />
            {(loading || isLoadingProducts) && (
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin ml-4" />
            )}
          </div>
        </div>

        {/* Results Area */}
        {query.trim() && (
          <div className="max-h-[60vh] overflow-y-auto">
            {(loading || isLoadingProducts) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {results.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleResultClick(product)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={imageUrl(product)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Name & Price */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {product.name}
                      </h3>
                      <p className="text-base text-gray-600 mt-1">
                        ${displayPrice(product).toFixed(2)}
                        {product.sale_price && product.sale_price < product.price && (
                          <span className="ml-2 text-sm text-gray-400 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Arrow Icon */}
                    <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-serif">
                  No products found for "{query}"
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            {isLoadingProducts ? (
              <>
                <Loader2 className="w-12 h-12 text-gray-300 mb-4 animate-spin" />
                <p className="text-gray-500 text-lg font-serif">
                  Loading products...
                </p>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-serif">
                  Start typing to search for products
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
