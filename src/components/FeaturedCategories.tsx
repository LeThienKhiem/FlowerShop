import React, { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/effect-coverflow';

interface FeaturedCategory {
  id: string;
  name: string;
  slug?: string | null;
}

interface FeaturedCategoriesProps {
  categories: FeaturedCategory[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string) => void;
  isLoading?: boolean;
}

const FeaturedCategories: React.FC<FeaturedCategoriesProps> = React.memo(({
  categories,
  selectedCategory,
  onCategoryChange,
  isLoading = false,
}) => {
  const swiperRef = useRef<SwiperType | null>(null);
  
  // Find the initial slide index based on selectedCategory
  const getInitialSlide = (): number => {
    if (!selectedCategory || categories.length === 0) return 0;
    const index = categories.findIndex((cat) => cat.id === selectedCategory);
    return index >= 0 ? index : 0;
  };
  
  const [activeIndex, setActiveIndex] = useState(() => getInitialSlide());

  // Update activeIndex when categories are first loaded
  useEffect(() => {
    if (categories.length > 0 && selectedCategory) {
      const index = categories.findIndex((cat) => cat.id === selectedCategory);
      if (index >= 0) {
        setActiveIndex(index);
      }
    }
  }, [categories.length, selectedCategory]);

  // Update swiper when selectedCategory changes externally
  useEffect(() => {
    if (swiperRef.current && selectedCategory && categories.length > 0) {
      const index = categories.findIndex((cat) => cat.id === selectedCategory);
      if (index >= 0 && swiperRef.current.activeIndex !== index) {
        swiperRef.current.slideTo(index);
        setActiveIndex(index);
      }
    }
  }, [selectedCategory, categories]);

  // Handle slide change (visual only - for immediate UI feedback)
  const handleSlideChange = (swiper: SwiperType) => {
    const newActiveIndex = swiper.activeIndex;
    setActiveIndex(newActiveIndex);
    // DO NOT call onCategoryChange here - it triggers heavy API fetches
    // This will only update visual styling immediately
  };

  // Debounced data fetching - only triggers after user stops swiping
  useEffect(() => {
    const timer = setTimeout(() => {
      const category = categories[activeIndex];
      if (category) {
        const newCategoryId = category.id;
        // Prevent redundant API calls if category is already selected
        if (selectedCategory !== newCategoryId) {
          onCategoryChange(newCategoryId);
        }
      }
    }, 600); // Wait 600ms after the LAST swipe motion

    return () => clearTimeout(timer); // Cleanup (Debounce)
  }, [activeIndex, categories, selectedCategory, onCategoryChange]);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-sans">Loading categories...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-sans">
          No featured categories available. Please mark categories as featured in the Admin Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="w-full sticky top-[72px] z-40 bg-white/95 backdrop-blur-md py-4 transition-all" 
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Block A: Mobile Only - 3D Swiper Carousel */}
      <div className="md:hidden w-full overflow-hidden">
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          effect={'coverflow'}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={'auto'}
          slideToClickedSlide={true}
          initialSlide={getInitialSlide()}
          coverflowEffect={{
            rotate: 30,
            stretch: 0,
            depth: 150,
            modifier: 1.2,
            slideShadows: false,
          }}
          modules={[EffectCoverflow]}
          onSlideChange={handleSlideChange}
          className="featured-categories-swiper"
          style={{
            paddingTop: '2rem',
            paddingBottom: '2rem',
          }}
        >
          {categories.map((category, index) => {
            const isActive = activeIndex === index;
            return (
              <SwiperSlide
                key={category.id}
                style={{
                  width: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onClick={() => {
                  if (swiperRef.current && index >= 0) {
                    swiperRef.current.slideTo(index);
                    // Note: Category change will be triggered by useEffect debounce
                    // after 600ms, preventing rapid-fire API calls
                  }
                }}
              >
                <div
                  className={`
                    px-6 py-4
                    transition-all duration-300 ease-out
                    cursor-pointer
                    select-none
                    ${isActive
                      ? 'text-gray-900 font-medium opacity-100 scale-110'
                      : 'text-gray-400 opacity-50 scale-90'
                    }
                  `}
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: isActive ? 'clamp(1.5rem, 4vw, 2.5rem)' : 'clamp(1rem, 3vw, 1.5rem)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {category.name}
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {/* Block B: Desktop Only - Simple Horizontal List */}
      <div className="hidden md:flex justify-center items-baseline gap-x-8 gap-y-4 mb-8">
        {categories.map((category) => {
          const isActive = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`
                font-serif transition-all duration-300 cursor-pointer
                ${isActive
                  ? 'text-5xl md:text-7xl text-gray-900 font-medium scale-110'
                  : 'text-3xl md:text-4xl text-gray-400 font-normal hover:text-gray-600 hover:scale-105'
                }
              `}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Custom Styles */}
      <style>{`
        .featured-categories-swiper {
          overflow: visible !important;
          padding: 2rem 0;
        }
        
        .featured-categories-swiper .swiper-wrapper {
          align-items: center;
          -webkit-overflow-scrolling: touch;
        }
        
        .featured-categories-swiper .swiper-slide {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          width: auto !important;
          margin: 0 0.5rem;
        }
        
        .featured-categories-swiper .swiper-slide-active {
          z-index: 10;
        }
        
        /* Hide default scrollbar */
        .featured-categories-swiper .swiper-scrollbar {
          display: none;
        }
        
        @media (max-width: 768px) {
          .featured-categories-swiper .swiper-slide {
            margin: 0 0.25rem;
          }
        }
      `}</style>
    </div>
  );
});

FeaturedCategories.displayName = 'FeaturedCategories';

export default FeaturedCategories;
