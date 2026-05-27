import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, ShoppingCart, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import SearchOverlay from './SearchOverlay';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  slug?: string;
}

const ANNOUNCEMENTS = [
  '🌸 Complimentary Local Delivery on All Bouquets — Order Today! 💐',
  '🌿 Freshly Cut Seasonal Blooms — Handcrafted Daily 🌸',
  '✨ New Arrivals Just Bloomed — Explore the Collection 💐',
  '💐 Order Before 2PM for Same-Day Delivery 🌸',
];

const Header: React.FC = () => {
  const { cartCount } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileShopDropdown, setShowMobileShopDropdown] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showDesktopShopDropdown, setShowDesktopShopDropdown] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  // Rotate announcement bar messages
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Toggle mobile menu
  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const sortCategoriesByName = (list: Category[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name));

  // Fetch categories from Supabase as a flat list
  useEffect(() => {
    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
          // Use placeholder data if Supabase fails
          const fallbackCategories: Category[] = [
            { id: '1-1', name: 'Birthday', parent_id: '1' },
            { id: '1-2', name: 'Anniversary', parent_id: '1' },
            { id: '1-3', name: 'Wedding', parent_id: '1' },
            { id: '2-1', name: 'Roses', parent_id: '2' },
            { id: '2-2', name: 'Lilies', parent_id: '2' },
            { id: '2-3', name: 'Tulips', parent_id: '2' },
            { id: '3-1', name: 'Classic Bouquet', parent_id: '3' },
            { id: '3-2', name: 'Premium Arrangement', parent_id: '3' },
          ];
          setCategories(sortCategoriesByName(fallbackCategories));
          return;
        }

        if (data && data.length > 0) {
          const allCategories = data as Category[];
          setCategories(sortCategoriesByName(allCategories));
        } else {
          // Use placeholder data if no categories found
          const fallbackCategories: Category[] = [
            { id: '1-1', name: 'Birthday', parent_id: '1' },
            { id: '1-2', name: 'Anniversary', parent_id: '1' },
            { id: '1-3', name: 'Wedding', parent_id: '1' },
            { id: '2-1', name: 'Roses', parent_id: '2' },
            { id: '2-2', name: 'Lilies', parent_id: '2' },
            { id: '2-3', name: 'Tulips', parent_id: '2' },
            { id: '3-1', name: 'Classic Bouquet', parent_id: '3' },
            { id: '3-2', name: 'Premium Arrangement', parent_id: '3' },
          ];
          setCategories(sortCategoriesByName(fallbackCategories));
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  // Generate slug from category name if slug doesn't exist
  const getCategorySlug = (category: Category): string => {
    if (category.slug) return category.slug;
    return category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  // Handle click outside to close desktop dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const dropdown = document.getElementById('desktop-shop-dropdown');
      const trigger = document.getElementById('desktop-shop-trigger');
      
      if (showDesktopShopDropdown && 
          dropdown && 
          trigger && 
          !dropdown.contains(target) && 
          !trigger.contains(target)) {
        setShowDesktopShopDropdown(false);
      }
    };

    if (showDesktopShopDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDesktopShopDropdown]);

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="w-full bg-pink-100 py-2 text-center text-xs font-medium uppercase tracking-widest text-pink-900">
        <span key={announcementIndex} className="inline-block animate-[fadeIn_0.6s_ease]">
          {ANNOUNCEMENTS[announcementIndex]}
        </span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <nav>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between py-4">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center">
              <img 
                src="https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/images/logo_black.png" 
                alt="Magnolia Floral" 
                className="h-8 md:h-10 w-auto object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base md:text-lg"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Home
              </Link>
              
              {/* Shop Blooms Dropdown */}
              <div 
                className="relative h-full flex items-center"
                onMouseEnter={() => setShowDesktopShopDropdown(true)}
              >
                <div
                  id="desktop-shop-trigger"
                  className="flex items-center"
                >
                  <Link
                    to="/shop"
                    className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base md:text-lg flex items-center gap-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Shop Blooms
                    <ChevronDown className="w-4 h-4" />
                  </Link>
                </div>
                {showDesktopShopDropdown && (
                  <>
                    {/* Invisible bridge to prevent gap */}
                    <div 
                      className="absolute top-full left-0 right-0 h-2 z-50"
                      onMouseEnter={() => setShowDesktopShopDropdown(true)}
                    />
                    <div 
                      id="desktop-shop-dropdown"
                      className="absolute top-full left-0 w-[600px] bg-white shadow-xl border border-gray-200 p-6 z-50"
                      style={{ marginTop: '0.5rem' }}
                      onMouseEnter={() => setShowDesktopShopDropdown(true)}
                      onMouseLeave={() => setShowDesktopShopDropdown(false)}
                    >
                  {isLoadingCategories ? (
                    <p className="text-gray-500 text-sm font-serif uppercase tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Loading categories...</p>
                  ) : categories.length > 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <Link
                          key={category.id}
                          to={`/category/${getCategorySlug(category)}`}
                          className="block text-sm text-gray-800 hover:text-[#6B8E23] transition-colors font-serif py-1"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm font-serif uppercase tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>No categories available</p>
                  )}
                  </div>
                  </>
                )}
              </div>

              <Link
                to="/about"
                className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base md:text-lg"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                About Us
              </Link>
              <Link
                to="/contact"
                className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base md:text-lg"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Contact Us
              </Link>
            </div>

            {/* Right Side Icons (Search, Cart, User, etc.) */}
            <div className="flex items-center gap-4">
              {/* Search Icon */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                aria-label="Search"
              >
                <Search size={24} className="text-gray-800" />
              </button>

              {/* Shopping Cart Icon */}
              <Link
                to="/cart"
                id="header-cart-icon"
                className="relative group p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ShoppingCart size={24} className="text-gray-800" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile Hamburger Button */}
              <button
                onClick={toggleMenu}
                className="flex md:hidden text-gray-800 hover:text-gray-600 transition-colors p-2"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 w-full bg-white shadow-lg border-t border-gray-100 z-50 md:hidden">
              <div className="max-h-[33vh] overflow-y-auto bg-white">
                <div className="flex flex-col p-4 gap-4">
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base py-2 px-4"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Home
                  </Link>
                  
                  {/* Mobile Shop Blooms Section */}
                  <div className="px-4">
                    <button
                      onClick={() => setShowMobileShopDropdown(!showMobileShopDropdown)}
                      className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base py-2 flex items-center gap-2 w-full"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Shop Blooms
                      <ChevronDown className={`w-4 h-4 transition-transform ${showMobileShopDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showMobileShopDropdown && (
                      <div className="pl-4 mt-2 space-y-3">
                        {isLoadingCategories ? (
                          <p className="text-gray-500 text-sm font-serif uppercase tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Loading...</p>
                        ) : categories.length > 0 ? (
                          <>
                            {categories.map((category) => (
                              <Link
                                key={category.id}
                                to={`/category/${getCategorySlug(category)}`}
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setShowMobileShopDropdown(false);
                                }}
                                className="block text-gray-700 hover:text-[#6B8E23] transition-colors font-serif text-sm py-1"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                              >
                                {category.name}
                              </Link>
                            ))}
                            <div className="pt-2 border-t border-gray-200">
                              <Link
                                to="/shop"
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setShowMobileShopDropdown(false);
                                }}
                                className="block text-[#6B8E23] font-semibold hover:underline font-serif text-sm uppercase tracking-wide"
                                style={{ fontFamily: "'Playfair Display', serif" }}
                              >
                                View All →
                              </Link>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-500 text-sm font-serif uppercase tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>No categories available</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    to="/about"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base py-2 px-4"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    About Us
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-black hover:text-[#6B8E23] transition-colors uppercase tracking-wide font-serif text-base py-2 px-4"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>
          )}
          </div>
        </nav>
      </header>

      {/* Search Overlay */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
