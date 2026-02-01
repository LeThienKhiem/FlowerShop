import React from 'react';
import { Link } from 'react-router-dom';

export interface Category {
  id: string;
  name: string;
  slug?: string | null;
}

export interface Product {
  id: number | string; // Can be number or UUID string
  name: string;
  price: number;
  sale_price?: number | null;
  images?: string[] | null;
  in_stock?: boolean;
  slug?: string;
  categories?: Category[]; // Array of categories for the product
  has_extras?: boolean; // Whether the product supports extra add-ons
  category?: Category | null; // Optional single category shape
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const isPerfectSpot = Boolean(
    product.category?.name === 'Perfect Spot' ||
      product.category?.slug === 'perfect-spot' ||
      product.categories?.some(
        (category) => category.name === 'Perfect Spot' || category.slug === 'perfect-spot'
      )
  );

  // Determine display price and original price
  const displayPrice = product.sale_price && product.sale_price < product.price 
    ? product.sale_price 
    : product.price;
  
  // Only show original price if there's an actual discount (original > current)
  const originalPrice = product.price > displayPrice ? product.price : null;
  
  // Calculate discount percentage only if there's a discount
  const discountPercentage = originalPrice && originalPrice > displayPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;
  
  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0] 
    : 'https://via.placeholder.com/400x400?text=No+Image';
  
  // Use product ID for the route - convert to string for URL
  const productLink = `/product/${String(product.id)}`;

  return (
    <Link 
      to={productLink}
      className="product-card group break-inside-avoid mb-4 bg-white p-2 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer block"
    >
      {/* Product Image */}
      <div className="product-image-wrapper w-full overflow-hidden rounded-lg mb-4">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      
      {/* Product Info */}
      <div className="text-black">
        <h3 className="text-lg font-medium mb-2 font-sans hover:text-[#6B8E23] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {isPerfectSpot ? (
            <span className="text-lg font-bold text-[#6B8E23] font-sans">
              Contact Shop
            </span>
          ) : (
            <>
              {/* Only show strikethrough price if original price is greater than display price */}
              {originalPrice && originalPrice > displayPrice && (
                <>
                  <del className="text-sm text-gray-500 font-sans">
                    ${originalPrice.toFixed(2)}
                  </del>
                  {discountPercentage > 0 && (
                    <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded font-sans">
                      -{discountPercentage}%
                    </span>
                  )}
                </>
              )}
              <span className="text-lg font-bold text-[#6B8E23] font-sans">
                ${displayPrice.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
