import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug?: string | null;
}

interface CategoryBarProps {
  activeSlug?: string | null;
}

// SVG Icons for Navigation Arrows
const ChevronLeft: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const CategoryBar: React.FC<CategoryBarProps> = ({ activeSlug = null }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Fetch all categories from Supabase
  useEffect(() => {
    async function loadCategories() {
      try {
        // Fetch ALL categories (no parent_id filter) - both parents and children
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
        } else if (data) {
          setCategories(data as Category[]);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback: Try fetching all categories without any join
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('categories')
            .select('id, name, slug')
            .order('display_order', { ascending: true });

          if (!fallbackError && fallbackData) {
            setCategories(fallbackData as Category[]);
          }
        } catch (fallbackErr) {
          console.error('Fallback category fetch failed:', fallbackErr);
        }
      }
    }

    loadCategories();
  }, []);

  // Scroll function for navigation arrows
  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 300;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Handle touch start to detect if user is scrolling or clicking
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  // Handle touch move to detect scrolling
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = Math.abs(touchX - touchStartX.current);
    const diffY = Math.abs(touchY - touchStartY.current);

    // If horizontal movement is greater than vertical, it's a scroll
    if (diffX > diffY && diffX > 5) {
      isDragging.current = true;
    }
  };

  // Handle link click - prevent navigation if it was a scroll
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Generate slug from name if slug is not available
  const getCategorySlug = (category: Category): string => {
    if (category.slug) {
      return category.slug;
    }
    // Generate slug from name (lowercase, replace spaces with hyphens)
    return category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  // Check if a category is active
  const isActive = (category: Category): boolean => {
    const slug = getCategorySlug(category);
    return slug === activeSlug || slug.toLowerCase() === activeSlug?.toLowerCase();
  };

  // Check if "All" button should be active
  const isAllActive = activeSlug === null || activeSlug === 'all' || activeSlug === undefined;

  return (
    <div className="relative group w-full">
      {/* Left Fade Curtain */}
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />

      {/* Left Arrow (Desktop Only) */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/80 shadow-md backdrop-blur-sm p-2 hover:bg-white transition-all duration-200 items-center justify-center"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-hide px-8 py-4 items-center relative z-0"
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          WebkitOverflowScrolling: 'touch', // iOS smooth scrolling
          touchAction: 'pan-x', // Allow horizontal panning on touch devices
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          // Reset after a short delay to allow click to fire if it wasn't a drag
          setTimeout(() => {
            isDragging.current = false;
          }, 100);
        }}
      >
        {/* "All" Button - Links to /shop */}
        <Link
          to="/shop"
          onClick={handleLinkClick}
          className={`flex-shrink-0 rounded-full px-6 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            isAllActive
              ? 'bg-pink-500 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          All
        </Link>

        {/* Category Pills */}
        {categories.map((category) => {
          const slug = getCategorySlug(category);
          const categoryActive = isActive(category);

          return (
            <Link
              key={category.id}
              to={`/category/${slug}`}
              onClick={handleLinkClick}
              className={`flex-shrink-0 rounded-full px-6 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                categoryActive
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </Link>
          );
        })}
      </div>

      {/* Right Fade Curtain */}
      <div className="hidden md:block absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

      {/* Right Arrow (Desktop Only) */}
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/80 shadow-md backdrop-blur-sm p-2 hover:bg-white transition-all duration-200 items-center justify-center"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
};

export default CategoryBar;
