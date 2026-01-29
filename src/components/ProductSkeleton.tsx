import React from 'react';

const ProductSkeleton: React.FC = () => {
  return (
    <div className="product-card break-inside-avoid mb-4 bg-white p-2">
      {/* Image Skeleton */}
      <div className="product-image-wrapper w-full overflow-hidden rounded-lg mb-4">
        <div className="bg-gray-200 aspect-[3/4] animate-pulse rounded-lg w-full"></div>
      </div>
      
      {/* Text Skeleton */}
      <div className="text-black">
        {/* Title skeleton */}
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
        {/* Price skeleton */}
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    </div>
  );
};

export default ProductSkeleton;
