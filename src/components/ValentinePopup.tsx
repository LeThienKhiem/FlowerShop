import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const STORAGE_KEY = 'hasSeenValentinePopup_2026';
const VALENTINE_IMAGE_URL =
  'https://rfalymblhmqkjgajlktp.supabase.co/storage/v1/object/public/Popup/valentine.png';
const SHOP_LINK = "/shop?category=Valentine's Day";

const ValentinePopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (!hasSeen) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const markAsSeenAndClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  const handleShopNow = (e: React.MouseEvent) => {
    e.preventDefault();
    markAsSeenAndClose();
    navigate(SHOP_LINK);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="valentine-popup-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/50 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={markAsSeenAndClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors shadow-sm"
          aria-label="Close"
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* Image at top */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] flex-shrink-0 bg-pink-50">
          <img
            src={VALENTINE_IMAGE_URL}
            alt="Valentine's Day"
            className="w-full h-full object-cover rounded-t-2xl"
          />
        </div>

        {/* Content stacked vertically */}
        <div className="flex flex-col items-center text-center px-6 py-6 sm:py-8 space-y-4">
          {/* Shop name - small caps, elegant */}
          <p
            className="text-xs sm:text-sm tracking-[0.2em] uppercase text-gray-500 font-medium"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Magnolia Florist
          </p>

          {/* Title */}
          <h2
            id="valentine-popup-title"
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Happy Valentine's Day
          </h2>

          {/* CTA - Shop Now */}
          <Link
            to={SHOP_LINK}
            onClick={handleShopNow}
            className="inline-flex items-center justify-center w-full max-w-xs px-8 py-3.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200"
          >
            Shop Now
          </Link>

          {/* Footer text with tel link */}
          <p className="text-xs sm:text-sm text-gray-500 pt-2">
            Call us at{' '}
            <a
              href="tel:0398773164"
              className="text-gray-700 hover:text-pink-600 underline underline-offset-2 transition-colors"
            >
              (03) 9877 3164
            </a>{' '}
            for further assistance!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValentinePopup;
