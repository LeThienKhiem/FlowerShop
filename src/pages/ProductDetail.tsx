import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { SIZE_OPTIONS, EXTRA_OPTIONS, EXTRA_ICONS, type SizeName } from '../lib/constants';
import ExtraOptionSelector from '../components/ExtraOptionSelector';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: number | string; // Can be number or UUID string
  name: string;
  price: number;
  sale_price?: number | null;
  description?: string | null;
  images?: string[] | null;
  in_stock?: boolean;
  sku?: string | null;
  has_extras?: boolean;
  has_sizes?: boolean;
  price_premium?: number | null;
  price_platinum?: number | null;
  categories?: Category[];
  category?: Category | null;
}

// Flying Flower Component for Cart Animation
interface FlyingFlowerProps {
  startX: number;
  startY: number;
  onComplete: () => void;
}

const FlyingFlower: React.FC<FlyingFlowerProps> = ({ startX, startY, onComplete }) => {
  const [style, setStyle] = useState<React.CSSProperties>({
    left: startX,
    top: startY,
    opacity: 1,
    transform: 'translate(-50%, -50%) scale(1)',
  });

  useEffect(() => {
    // 1. Find the Cart Icon in the DOM
    const cartIcon = document.getElementById('header-cart-icon');
    
    let targetX = window.innerWidth - 50; // Default fallback (Top Right)
    let targetY = 20;

    // 2. Calculate Exact Center of the Icon
    if (cartIcon) {
      const rect = cartIcon.getBoundingClientRect();
      targetX = rect.left + (rect.width / 2); // Center of icon (translate -50% will center the flower)
      targetY = rect.top + (rect.height / 2); // Center of icon
    }

    // 3. Trigger Animation Frame (with slight delay for slow start effect)
    const frame = requestAnimationFrame(() => {
      setStyle({
        left: targetX,
        top: targetY,
        opacity: 0.3, // Fade out but keep some visibility
        transform: 'translate(-50%, -50%) scale(0.3)', // Shrink but not too tiny
      });
    });

    // Cleanup after animation duration (1.5s)
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed z-[9999] pointer-events-none flex items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-500/30"
      style={{
        ...style,
        width: '40px',
        height: '40px',
        transition: 'all 1.5s cubic-bezier(0.7, 0, 1, 0.5)',
      }}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-6 h-6 text-pink-50/90"
      >
        <path 
          fillRule="evenodd" 
          d="M12 2.25a.75.75 0 01.75.75v.756a3.23 3.23 0 011.012.427 1.75 1.75 0 012.415-2.415 3.23 3.23 0 01.427 1.012h.756a.75.75 0 010 1.5h-.756a3.23 3.23 0 01-.427 1.012 1.75 1.75 0 01-2.415 2.415 3.23 3.23 0 01-1.012.427v.756a.75.75 0 01-1.5 0v-.756a3.23 3.23 0 01-1.012-.427 1.75 1.75 0 01-2.415-2.415 3.23 3.23 0 01-.427-1.012h-.756a.75.75 0 010-1.5h.756a3.23 3.23 0 01.427-1.012 1.75 1.75 0 012.415-2.415 3.23 3.23 0 011.012.427V3a.75.75 0 01.75-.75zM6.75 9.75a3 3 0 013-3h4.5a3 3 0 013 3v2.25a3 3 0 01-3 3h-4.5a3 3 0 01-3-3V9.75zM9 12.75a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm4.5-1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" 
          clipRule="evenodd" 
        />
        <path d="M8.25 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM15.75 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM12 18.75a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75z" />
      </svg>
    </div>
  );
};


const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cart context
  const { addToCart } = useCart();
  
  // Animation and loading states
  const [flyingParticles, setFlyingParticles] = useState<{id: number, x: number, y: number}[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [selectedSize, setSelectedSize] = useState<SizeName>('Regular');
  const [quantity, setQuantity] = useState(1);
  const [cardMessage, setCardMessage] = useState('');
  const [isMultiMessage, setIsMultiMessage] = useState(false);
  const [cardMessages, setCardMessages] = useState<string[]>(['']);

  // Update cardMessages array when quantity changes in multi-message mode
  useEffect(() => {
    if (isMultiMessage && quantity >= 2) {
      setCardMessages(prev => {
        const currentLength = prev.length;
        if (quantity > currentLength) {
          // Add empty strings for new items
          return [...prev, ...Array.from({ length: quantity - currentLength }, () => '')];
        } else if (quantity < currentLength) {
          // Remove excess messages
          return prev.slice(0, quantity);
        }
        return prev;
      });
    }
  }, [quantity, isMultiMessage]);
  
  // Character limit for card message
  const MAX_MESSAGE_LENGTH = 200;
  
  // Extras state - stores index of selected option for each category
  const [extras, setExtras] = useState<{ [key: string]: number }>({
    balloon: 0,
    bear: 0,
    chocolate: 0,
    vase: 0,
    wine: 0
  });

  // Scroll to top when product ID changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    async function loadProduct() {
      if (!id) {
        console.error('ProductDetail: No ID provided in URL params');
        setError('Invalid product ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('ProductDetail: Fetching product with ID:', id);
        console.log('ProductDetail: ID type:', typeof id);
        console.log('ProductDetail: ID value:', id);

        // Try to determine if ID is UUID or numeric
        // UUIDs are typically 36 characters with hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const isNumeric = /^\d+$/.test(id);

        console.log('ProductDetail: Is UUID?', isUUID);
        console.log('ProductDetail: Is Numeric?', isNumeric);

        // Use the ID as-is if UUID, keep as string for numeric IDs (handles BigInt)
        // Supabase can handle string numbers for BIGSERIAL/BIGINT columns
        let queryId: string | number;
        if (isUUID) {
          queryId = id;
        } else if (isNumeric) {
          // Try as both number and string - Supabase might prefer one or the other
          // For BIGSERIAL, we should use the string representation to avoid precision loss
          queryId = id; // Use as string first to avoid BigInt precision issues
        } else {
          queryId = id;
        }

        console.log('ProductDetail: Query ID (final):', queryId, 'Type:', typeof queryId);

        const productSelect = `
          *,
          product_categories(
            category_id,
            categories(
              id,
              name
            )
          )
        `;

        const normalizeProduct = (rawProduct: any): Product => {
          const productCategories: Category[] = [];

          if (rawProduct?.product_categories && Array.isArray(rawProduct.product_categories)) {
            rawProduct.product_categories.forEach((pc: any) => {
              if (pc.categories?.id) {
                productCategories.push({
                  id: pc.categories.id,
                  name: pc.categories.name,
                });
              }
            });
          }

          const { product_categories: _ignored, ...rest } = rawProduct || {};
          return {
            ...rest,
            categories: productCategories,
          };
        };

        // Fetch product by ID - try with the ID as provided first
        let { data, error: productError } = await supabase
          .from('products')
          .select(productSelect)
          .eq('id', queryId)
          .single();

        // If that fails and it's numeric, try as number
        if (productError && isNumeric && typeof queryId === 'string') {
          console.log('ProductDetail: Retrying with numeric ID:', parseInt(id, 10));
          const numericId = parseInt(id, 10);
          if (!isNaN(numericId)) {
            const retryResult = await supabase
              .from('products')
              .select(productSelect)
              .eq('id', numericId)
              .single();
            data = retryResult.data;
            productError = retryResult.error;
            console.log('ProductDetail: Retry result - data:', data, 'error:', productError);
          }
        }

        console.log('ProductDetail: Supabase response - data:', data);
        console.log('ProductDetail: Supabase response - error:', productError);

        if (productError) {
          console.error('ProductDetail: Error fetching product:', productError);
          console.error('ProductDetail: Error code:', productError.code);
          console.error('ProductDetail: Error message:', productError.message);
          console.error('ProductDetail: Error details:', productError.details);
          console.error('ProductDetail: Error hint:', productError.hint);

          // If single() returns PGRST116 (no rows), try without single() to see if we get an array
          if (productError.code === 'PGRST116') {
            console.log('ProductDetail: PGRST116 error - trying without .single()');
            
            const { data: arrayData, error: arrayError } = await supabase
              .from('products')
              .select(productSelect)
              .eq('id', queryId);

            console.log('ProductDetail: Array query - data:', arrayData);
            console.log('ProductDetail: Array query - error:', arrayError);

            if (arrayError) {
              setError(`Product not found: ${arrayError.message}`);
            } else if (arrayData && arrayData.length > 0) {
              console.log('ProductDetail: Found product in array:', arrayData[0]);
              setProduct(normalizeProduct(arrayData[0]));
            } else {
              setError('Product not found in database');
            }
          } else {
            setError(`Error loading product: ${productError.message}`);
          }
          
          setIsLoading(false);
          return;
        }

        if (data) {
          console.log('ProductDetail: Product loaded successfully:', data);
          setProduct(normalizeProduct(data));
        } else {
          console.warn('ProductDetail: No data returned from Supabase');
          setError('Product not found');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('ProductDetail: Unexpected error loading product:', err);
        setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="py-12 px-6 flex-1">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
              {/* Left Column: Image Placeholder */}
              <div className="space-y-4">
                <div className="aspect-square w-full bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>

              {/* Right Column: Info Placeholders */}
              <div className="space-y-6">
                {/* Title */}
                <div className="h-12 bg-gray-200 rounded w-3/4"></div>
                
                {/* SKU placeholder (optional, may not show) */}
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                
                {/* Price */}
                <div className="h-10 bg-gray-200 rounded w-1/4"></div>
                
                {/* Button */}
                <div className="h-14 bg-gray-200 rounded w-full mt-8"></div>
                
                {/* Description */}
                <div className="pt-6 border-t border-gray-200 space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1">
        <div className="flex items-center justify-center py-32">
          <div className="text-center max-w-md mx-4">
            <p className="text-red-500 font-sans mb-2 font-semibold">{error || 'Product not found'}</p>
            {id && (
              <p className="text-gray-500 font-sans text-sm mb-4">
                Attempted to load product ID: <code className="bg-gray-100 px-2 py-1 rounded">{id}</code>
              </p>
            )}
            <p className="text-gray-600 font-sans text-sm mb-6">
              Please check the browser console for detailed error information.
            </p>
            <Link to="/" className="text-[#6B8E23] hover:underline font-serif inline-block px-6 py-2 border border-[#6B8E23] rounded-lg hover:bg-[#6B8E23] hover:text-white transition-colors">
              Return to Home
            </Link>
          </div>
        </div>
        </main>
      </div>
    );
  }

  const isPerfectSpot = Boolean(
    product.category?.name === 'Perfect Spot' ||
      product.categories?.some((category) => category.name === 'Perfect Spot')
  );

  // Get base price (sale_price if available, otherwise regular price)
  const basePrice = product.sale_price && product.sale_price < product.price 
    ? product.sale_price 
    : product.price;
  
  const originalPrice = product.sale_price && product.sale_price < product.price 
    ? product.price 
    : null;
  
  const hasSizes = product.has_sizes !== false;

  const sizeOptions = hasSizes
    ? SIZE_OPTIONS.map((option) => {
        if (option.name === 'Regular') {
          return { ...option, extraPrice: 0 };
        }
        if (option.name === 'Premium') {
          const premiumPrice = product.price_premium != null && product.price_premium > 0
            ? product.price_premium
            : basePrice * 1.3;
          return { ...option, extraPrice: Math.max(0, premiumPrice - basePrice) };
        }
        if (option.name === 'Platinum') {
          const platinumPrice = product.price_platinum != null && product.price_platinum > 0
            ? product.price_platinum
            : basePrice * 1.6;
          return { ...option, extraPrice: Math.max(0, platinumPrice - basePrice) };
        }
        return option;
      })
    : [{ name: 'Regular' as const, label: 'Standard', extraPrice: 0 }];

  // Get selected size option
  const selectedSizeOption = sizeOptions.find(option => option.name === selectedSize) || sizeOptions[0];
  
  // Calculate extras total
  const extrasTotal = Object.entries(extras).reduce((total, [category, index]) => {
    const options = EXTRA_OPTIONS[category as keyof typeof EXTRA_OPTIONS];
    const selectedOption = options[index] || options[0];
    return total + (selectedOption.price || 0);
  }, 0);
  
  // Calculate final price: base + size premium (when has_sizes) + extras
  const finalPrice = basePrice + (hasSizes ? selectedSizeOption.extraPrice : 0) + extrasTotal;
  
  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['https://via.placeholder.com/600x600?text=No+Image'];

  const mainImage = images[selectedImageIndex] || images[0];

  // Helper function to build product message
  const buildProductMessage = () => {
    // Build extras summary
    const selectedExtras: string[] = [];
    Object.entries(extras).forEach(([category, index]) => {
      const options = EXTRA_OPTIONS[category as keyof typeof EXTRA_OPTIONS];
      const selectedOption = options[index];
      if (selectedOption && selectedOption.price > 0 && 'name' in selectedOption && selectedOption.name) {
        selectedExtras.push(selectedOption.name);
      }
    });

    // Build summary string
    let summary = `Size: ${selectedSize}`;
    if (selectedExtras.length > 0) {
      summary += ` | Extras: ${selectedExtras.join(', ')}`;
    }

    // Combine with card message(s)
    let fullMessage = '';
    if (isMultiMessage && cardMessages.length > 0) {
      const messages = cardMessages.map((msg, idx) => 
        msg ? `Item ${idx + 1}: ${msg}` : `Item ${idx + 1}: (No message)`
      ).join('\n\n');
      fullMessage = `${messages}\n\n${summary}`;
    } else {
      fullMessage = cardMessage 
        ? `${cardMessage}\n\n${summary}`
        : summary;
    }
    
    return fullMessage;
  };

  const buildSelectedOptions = () => {
    const sizeLabel = selectedSizeOption.extraPrice > 0
      ? `${selectedSizeOption.label} (+$${selectedSizeOption.extraPrice.toFixed(2)})`
      : selectedSizeOption.label;

    const options: Record<string, any> = {
      Size: sizeLabel,
    };

    Object.entries(extras).forEach(([category, index]) => {
      const optionList = EXTRA_OPTIONS[category as keyof typeof EXTRA_OPTIONS];
      const selectedOption = optionList[index];
      if (selectedOption && selectedOption.price > 0) {
        const label = category.charAt(0).toUpperCase() + category.slice(1);
        options[label] = selectedOption.label;
      }
    });

    if (isMultiMessage && cardMessages.length > 0) {
      options.Message = cardMessages.map((msg, idx) =>
        msg ? `Item ${idx + 1}: ${msg}` : `Item ${idx + 1}: (No message)`
      );
    } else if (cardMessage.trim()) {
      options.Message = cardMessage.trim();
    }

    return options;
  };

  // Handle add to cart logic with animation
  const handleAddToCart = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (isPerfectSpot) {
      return;
    }
    if (product && product.in_stock !== false && !isAdding) {
      setIsAdding(true);
      
      // Get click coordinates for animation
      if (e) {
        const x = e.clientX;
        const y = e.clientY;
        const newId = Date.now();
        
        // Add flying flower particle
        setFlyingParticles(prev => [...prev, { id: newId, x, y }]);
      }

      // Build product message
      const fullMessage = buildProductMessage();
      const selectedOptions = buildSelectedOptions();

      // Create product with calculated price for cart
      const productWithCalculatedPrice: Product = {
        ...product,
        price: finalPrice,
        // Clear sale_price since we're using the calculated price
        sale_price: null
      };
      
      addToCart(productWithCalculatedPrice, quantity, selectedSize, fullMessage, selectedOptions);
      
      // Reset loading state after animation
      setTimeout(() => {
        setIsAdding(false);
      }, 1000);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 py-12 px-4 pb-24 md:pb-12 overflow-x-hidden flex-1">
            {/* Left Column: Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Thumbnail Grid */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-[#6B8E23] ring-2 ring-[#6B8E23] ring-offset-2'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Details & Form */}
            <div className="flex flex-col space-y-6">
              {/* Header Section */}
              <div>
                {/* Title */}
                <h1 className="text-4xl font-serif font-bold text-stone-900 mb-4">
                  {product.name}
                </h1>

                {/* Reviews */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={18}
                        className={star <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 font-sans">
                    618 Reviews | 5 Questions
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center">
                  {isPerfectSpot ? (
                    <span className="text-3xl font-bold text-stone-900 font-sans">
                      Contact Shop
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-stone-900 font-sans">
                        ${finalPrice.toFixed(2)}
                      </span>
                      {originalPrice && (
                        <del className="text-gray-500 line-through text-lg ml-2 font-sans">
                          ${originalPrice.toFixed(2)}
                        </del>
                      )}
                    </>
                  )}
                </div>
                {isPerfectSpot && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-700 font-sans">
                      This is a seasonal flower arrangement. Please contact us to check availability.
                    </p>
                    <a
                      href="tel:+61398773164"
                      className="inline-flex items-center justify-center px-6 py-3 bg-stone-900 text-white font-bold rounded uppercase tracking-widest transition-all duration-200 font-sans hover:bg-stone-800"
                    >
                      Call Us to Order: (03) 9877 3164
                    </a>
                  </div>
                )}
              </div>

              {/* Form Options */}
              <div className="space-y-6">
                {/* SIZE Selector (only when product has_sizes) */}
                {!isPerfectSpot && hasSizes && (
                  <div>
                    <label className="block text-sm font-semibold text-stone-900 uppercase tracking-wide font-sans">
                      SIZE
                    </label>
                    <div className="grid grid-cols-3 gap-2 md:flex md:gap-4 mt-2">
                      {sizeOptions.map((option) => (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => setSelectedSize(option.name as SizeName)}
                          className={`px-1 py-3 md:px-6 md:py-3 border-2 rounded transition-all duration-300 font-medium font-sans flex flex-col items-center justify-center ${
                            selectedSize === option.name
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'border-stone-200 text-stone-900 hover:border-stone-900 hover:bg-stone-50'
                          }`}
                        >
                          <span className="text-xs md:text-base font-semibold">
                            {option.label}
                          </span>
                          {option.extraPrice > 0 && (
                            <span className="text-[10px] md:text-sm mt-0.5">
                              (+${option.extraPrice.toFixed(2)})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* QUANTITY Selector */}
                {!isPerfectSpot && (
                  <div>
                    <label className="block text-sm font-semibold text-stone-900 uppercase tracking-wide font-sans">
                      QUANTITY
                    </label>
                    <div className="flex items-center border-2 border-stone-200 rounded w-fit mt-2 group focus-within:border-stone-900 transition-colors">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-4 py-2 text-xl text-gray-500 hover:text-stone-900 hover:bg-gray-100 transition font-sans"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center border-none focus:ring-0 font-bold font-sans"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-4 py-2 text-xl text-gray-500 hover:text-stone-900 hover:bg-gray-100 transition font-sans"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* CHOOSE EXTRAS (Conditional) */}
                {!isPerfectSpot && product.has_extras && (
                  <div>
                    <h3 className="text-center text-lg font-serif font-semibold text-stone-900 uppercase tracking-wide mb-6 mt-8">
                      CHOOSE EXTRAS TO MAKE IT MORE SPECIAL
                    </h3>
                    <div className="space-y-6">
                      {/* Balloon */}
                      <ExtraOptionSelector
                        title="Balloon"
                        options={EXTRA_OPTIONS.balloon}
                        selectedIdx={extras.balloon}
                        onSelect={(index) => setExtras({ ...extras, balloon: index })}
                        icon={EXTRA_ICONS.balloon}
                      />

                      {/* Bear */}
                      <ExtraOptionSelector
                        title="Bear"
                        options={EXTRA_OPTIONS.bear}
                        selectedIdx={extras.bear}
                        onSelect={(index) => setExtras({ ...extras, bear: index })}
                        icon={EXTRA_ICONS.bear}
                      />

                      {/* Chocolate */}
                      <ExtraOptionSelector
                        title="Chocolate"
                        options={EXTRA_OPTIONS.chocolate}
                        selectedIdx={extras.chocolate}
                        onSelect={(index) => setExtras({ ...extras, chocolate: index })}
                        icon={EXTRA_ICONS.chocolate}
                      />

                      {/* Vase */}
                      <ExtraOptionSelector
                        title="Vase"
                        options={EXTRA_OPTIONS.vase}
                        selectedIdx={extras.vase}
                        onSelect={(index) => setExtras({ ...extras, vase: index })}
                        icon={EXTRA_ICONS.vase}
                      />

                      {/* Wine */}
                      <ExtraOptionSelector
                        title="Wine"
                        options={EXTRA_OPTIONS.wine}
                        selectedIdx={extras.wine}
                        onSelect={(index) => setExtras({ ...extras, wine: index })}
                        icon={EXTRA_ICONS.wine}
                      />
                    </div>
                  </div>
                )}

                {/* 4. MESSAGE BOX */}
                {!isPerfectSpot && (
                  <div>
                    <label className="block text-sm font-semibold text-stone-900 uppercase tracking-wide mb-3 font-sans">
                      CARD MESSAGE
                    </label>
                    
                    {/* Multi-Message Checkbox (only show if quantity >= 2) */}
                    {quantity >= 2 && (
                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isMultiMessage}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setIsMultiMessage(checked);
                              if (checked) {
                                // Initialize array with quantity number of empty strings
                                setCardMessages(Array.from({ length: quantity }, () => ''));
                                setCardMessage(''); // Clear single message
                              } else {
                                // Reset to single message mode
                                setCardMessages(['']);
                              }
                            }}
                            className="w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-900 focus:ring-2"
                          />
                          <span className="text-sm text-stone-700 font-sans">
                            Send separate card messages for each item
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Single Message Mode */}
                    {!isMultiMessage ? (
                      <div className="bg-[#fff9f0] p-6 rounded-lg border border-stone-200 shadow-sm relative">
                        {/* Personal Note Header */}
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-4 h-4 text-stone-600" />
                          <span className="text-sm font-medium text-stone-700 font-serif italic">
                            Personal Note
                          </span>
                        </div>
                        
                        {/* Textarea */}
                        <textarea
                          value={cardMessage}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= MAX_MESSAGE_LENGTH) {
                              setCardMessage(value);
                            }
                          }}
                          placeholder="Write your heartfelt message here..."
                          maxLength={MAX_MESSAGE_LENGTH}
                          className="w-full bg-transparent border-none resize-none focus:outline-none placeholder:text-stone-400 text-stone-800 font-serif text-base leading-relaxed"
                          style={{ 
                            fontFamily: "'Playfair Display', 'Georgia', serif",
                            minHeight: '120px'
                          }}
                        />
                        
                        {/* Character Counter */}
                        <div className="flex justify-end mt-2 pt-2 border-t border-stone-200">
                          <span className={`text-xs font-sans ${
                            cardMessage.length >= MAX_MESSAGE_LENGTH 
                              ? 'text-red-500' 
                              : 'text-stone-500'
                          }`}>
                            {cardMessage.length}/{MAX_MESSAGE_LENGTH}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Multi-Message Mode */
                      <div className="space-y-4">
                        {Array.from({ length: quantity }).map((_, index) => (
                          <div key={index} className="bg-[#fff9f0] p-6 rounded-lg border border-stone-200 shadow-sm relative">
                            {/* Personal Note Header */}
                            <div className="flex items-center gap-2 mb-4">
                              <FileText className="w-4 h-4 text-stone-600" />
                              <span className="text-sm font-medium text-stone-700 font-serif italic">
                                Card Message for Item #{index + 1}
                              </span>
                            </div>
                            
                            {/* Textarea */}
                            <textarea
                              value={cardMessages[index] || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.length <= MAX_MESSAGE_LENGTH) {
                                  const updatedMessages = [...cardMessages];
                                  updatedMessages[index] = value;
                                  setCardMessages(updatedMessages);
                                }
                              }}
                              placeholder={`Message for item #${index + 1}...`}
                              maxLength={MAX_MESSAGE_LENGTH}
                              className="w-full bg-transparent border-none resize-none focus:outline-none placeholder:text-stone-400 text-stone-800 font-serif text-base leading-relaxed"
                              style={{ 
                                fontFamily: "'Playfair Display', 'Georgia', serif",
                                minHeight: '120px'
                              }}
                            />
                            
                            {/* Character Counter */}
                            <div className="flex justify-end mt-2 pt-2 border-t border-stone-200">
                              <span className={`text-xs font-sans ${
                                (cardMessages[index] || '').length >= MAX_MESSAGE_LENGTH 
                                  ? 'text-red-500' 
                                  : 'text-stone-500'
                              }`}>
                                {(cardMessages[index] || '').length}/{MAX_MESSAGE_LENGTH}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CTA Buttons (Desktop) */}
              {!isPerfectSpot && (
                <div className="hidden md:flex flex-col sm:flex-row gap-3 mt-8">
                  <button
                    disabled={product.in_stock === false || isAdding}
                    onClick={handleAddToCart}
                    className={`flex-1 bg-stone-900 text-white text-lg font-bold py-4 rounded uppercase tracking-widest transition-all duration-200 font-sans ${
                      product.in_stock === false || isAdding
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'hover:bg-stone-800 active:scale-[0.98]'
                    }`}
                  >
                    {product.in_stock === false ? 'Out of Stock' : isAdding ? 'Adding...' : 'ADD TO CART'}
                  </button>
                </div>
              )}
            </div>
      </main>

      {/* Flying Flowers Animation */}
      {flyingParticles.map((particle) => (
        <FlyingFlower
          key={particle.id}
          startX={particle.x}
          startY={particle.y}
          onComplete={() => setFlyingParticles(prev => prev.filter(p => p.id !== particle.id))}
        />
      ))}

      {/* Sticky Bottom Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-lg w-full max-w-[100vw]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {isPerfectSpot ? (
          <div className="container mx-auto flex items-center justify-center gap-4 w-full">
            <a
              href="tel:+61398773164"
              className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg uppercase tracking-wide transition-all duration-200 font-sans text-center hover:bg-stone-800"
            >
              Call Us to Order: (03) 9877 3164
            </a>
          </div>
        ) : (
          <div className="container mx-auto flex items-center justify-between gap-4 w-full">
            {/* Left: Total Price */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-sans uppercase tracking-wide">Total</span>
              <span className="text-2xl font-bold text-stone-900 font-sans">
                ${finalPrice.toFixed(2)}
              </span>
            </div>

            {/* Right: Button */}
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                disabled={product.in_stock === false || isAdding}
                onClick={(e) => handleAddToCart(e)}
                className={`flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-lg uppercase tracking-wide transition-all duration-200 font-sans ${
                  product.in_stock === false || isAdding
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'hover:bg-stone-800 active:scale-[0.98]'
                }`}
              >
                {product.in_stock === false ? 'Out of Stock' : isAdding ? 'Adding...' : 'Add to Cart'}
              </button>
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

export default ProductDetail;
