import React from 'react';
import { useLocation } from 'react-router-dom';
import { Phone } from 'lucide-react';

const FloatingCallBtn: React.FC = () => {
  const location = useLocation();
  const isProductPage = location.pathname.includes('/product/');

  return (
    <a
      href="tel:0398773164"
      target="_self"
      className={`fixed z-[60] ${isProductPage ? 'bottom-28' : 'bottom-4'} right-6 md:bottom-4 md:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-xl shadow-pink-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 animate-wiggle-interval`}
      aria-label="Call us"
    >
      <Phone className="w-7 h-7 text-white" />
    </a>
  );
};

export default FloatingCallBtn;
