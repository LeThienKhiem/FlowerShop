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

interface CategoryWithChildren extends Category {
  children: Category[];
}

const Header: React.FC = () => {
  const { cartCount } = useCart();
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileShopDropdown, setShowMobileShopDropdown] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showDesktopShopDropdown, setShowDesktopShopDropdown] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Toggle mobile menu
  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Fetch categories from Supabase and group them by parent
  useEffect(() => {
    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
          // Use placeholder data if Supabase fails
          setCategories([
            {
              id: '1',
              name: 'Occasions',
              parent_id: null,
              children: [
                { id: '1-1', name: 'Birthday', parent_id: '1' },
                { id: '1-2', name: 'Anniversary', parent_id: '1' },
                { id: '1-3', name: 'Wedding', parent_id: '1' },
              ],
            },
            {
              id: '2',
              name: 'Floral',
              parent_id: null,
              children: [
                { id: '2-1', name: 'Roses', parent_id: '2' },
                { id: '2-2', name: 'Lilies', parent_id: '2' },
                { id: '2-3', name: 'Tulips', parent_id: '2' },
              ],
            },
            {
              id: '3',
              name: 'Best Sellers',
              parent_id: null,
              children: [
                { id: '3-1', name: 'Classic Bouquet', parent_id: '3' },
                { id: '3-2', name: 'Premium Arrangement', parent_id: '3' },
              ],
            },
          ]);
          return;
        }

        if (data && data.length > 0) {
          // Separate parents and children
          const parentCategories: CategoryWithChildren[] = [];
          const childCategories: Category[] = [];

          data.forEach((cat: Category) => {
            if (cat.parent_id === null) {
              parentCategories.push({ ...cat, children: [] });
            } else {
              childCategories.push(cat);
            }
          });

          // Assign children to their parents
          parentCategories.forEach((parent) => {
            parent.children = childCategories.filter(
              (child) => child.parent_id === parent.id
            );
          });

          setCategories(parentCategories);
        } else {
          // Use placeholder data if no categories found
          setCategories([
            {
              id: '1',
              name: 'Occasions',
              parent_id: null,
              children: [
                { id: '1-1', name: 'Birthday', parent_id: '1' },
                { id: '1-2', name: 'Anniversary', parent_id: '1' },
                { id: '1-3', name: 'Wedding', parent_id: '1' },
              ],
            },
            {
              id: '2',
              name: 'Floral',
              parent_id: null,
              children: [
                { id: '2-1', name: 'Roses', parent_id: '2' },
                { id: '2-2', name: 'Lilies', parent_id: '2' },
                { id: '2-3', name: 'Tulips', parent_id: '2' },
              ],
            },
            {
              id: '3',
              name: 'Best Sellers',
              parent_id: null,
              children: [
                { id: '3-1', name: 'Classic Bouquet', parent_id: '3' },
                { id: '3-2', name: 'Premium Arrangement', parent_id: '3' },
              ],
            },
          ]);
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
        ✨✨ Order Now for Valentine's Day 💐 ✨
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
                    <div className="columns-2 gap-8">
                      {categories.map((parentCategory) => (
                        <div 
                          key={parentCategory.id}
                          className="break-inside-avoid mb-6"
                        >
                          <Link
                            to={`/category/${getCategorySlug(parentCategory)}`}
                            className="block text-sm font-bold text-gray-900 uppercase tracking-wide mb-2 hover:text-[#6B8E23] transition-colors font-serif"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                          >
                            {parentCategory.name}
                          </Link>
                          {parentCategory.children && parentCategory.children.length > 0 && (
                            <div className="pl-2 space-y-1 mt-1">
                              {parentCategory.children.map((childCategory) => (
                                <Link
                                  key={childCategory.id}
                                  to={`/category/${getCategorySlug(childCategory)}`}
                                  className="block text-sm text-gray-600 hover:text-[#6B8E23] transition-colors font-serif py-1"
                                  style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                  {childCategory.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
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
                            {categories.map((parentCategory) => (
                              <div key={parentCategory.id} className="break-inside-avoid">
                                <Link
                                  to={`/category/${getCategorySlug(parentCategory)}`}
                                  onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setShowMobileShopDropdown(false);
                                  }}
                                  className="block text-gray-900 font-bold uppercase tracking-wide mb-1 hover:text-[#6B8E23] transition-colors font-serif text-sm"
                                  style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                  {parentCategory.name}
                                </Link>
                                {parentCategory.children && parentCategory.children.length > 0 && (
                                  <div className="pl-2 space-y-1">
                                    {parentCategory.children.map((childCategory) => (
                                      <Link
                                        key={childCategory.id}
                                        to={`/category/${getCategorySlug(childCategory)}`}
                                        onClick={() => {
                                          setIsMobileMenuOpen(false);
                                          setShowMobileShopDropdown(false);
                                        }}
                                        className="block text-gray-600 hover:text-[#6B8E23] transition-colors font-serif text-xs py-1"
                                        style={{ fontFamily: "'Playfair Display', serif" }}
                                      >
                                        {childCategory.name}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
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
