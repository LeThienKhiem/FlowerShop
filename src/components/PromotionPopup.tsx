import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PROMO_ID = 1;

interface Promotion {
  id: number;
  shop_name: string | null;
  title: string | null;
  cta_text: string | null;
  cta_link: string | null;
  contact_info: string | null;
  image_url: string | null;
  is_active: boolean;
}

function storageKey(id: number): string {
  return `seen_promo_${id}`;
}

const PromotionPopup: React.FC = () => {
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function fetchAndDecide() {
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('id, shop_name, title, cta_text, cta_link, contact_info, image_url, is_active')
          .eq('id', PROMO_ID)
          .maybeSingle();

        if (!mounted) return;
        if (error) {
          console.error('Promotion fetch error:', error);
          setLoading(false);
          return;
        }

        const p = data as Promotion | null;
        if (!p || !p.is_active) {
          setLoading(false);
          return;
        }

        setPromo(p);
        try {
          const seen = localStorage.getItem(storageKey(p.id));
          if (!seen) setIsVisible(true);
        } catch {
          setIsVisible(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAndDecide();
    return () => { mounted = false; };
  }, []);

  const markAsSeenAndClose = () => {
    if (!promo) return;
    try {
      localStorage.setItem(storageKey(promo.id), 'true');
    } catch {
      /* ignore */
    }
    setIsVisible(false);
  };

  if (loading || !promo || !isVisible) return null;

  const shopName = promo.shop_name?.trim() || '';
  const title = promo.title?.trim() || 'Special offer';
  const ctaText = promo.cta_text?.trim() || 'Shop Now';
  const ctaLink = promo.cta_link?.trim() || '/shop';
  const contactInfo = promo.contact_info?.trim() || '';
  const imageUrl = promo.image_url?.trim() || null;
  const isExternalCta = /^https?:\/\//i.test(ctaLink);

  const handleCtaClick = (e: React.MouseEvent) => {
    markAsSeenAndClose();
    if (!isExternalCta) {
      e.preventDefault();
      navigate(ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/50 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={markAsSeenAndClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors shadow-sm"
          aria-label="Close"
        >
          <X size={20} strokeWidth={2} />
        </button>

        {imageUrl && (
          <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] flex-shrink-0 bg-pink-50">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover rounded-t-2xl"
            />
          </div>
        )}

        <div className="flex flex-col items-center text-center px-6 py-6 sm:py-8 space-y-4">
          {shopName && (
            <p
              className="text-xs sm:text-sm tracking-[0.2em] uppercase text-gray-500 font-medium"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {shopName}
            </p>
          )}

          <h2
            id="promo-popup-title"
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h2>

          {isExternalCta ? (
            <a
              href={ctaLink}
              onClick={handleCtaClick}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full max-w-xs px-8 py-3.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200"
            >
              {ctaText}
            </a>
          ) : (
            <Link
              to={ctaLink}
              onClick={handleCtaClick}
              className="inline-flex items-center justify-center w-full max-w-xs px-8 py-3.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200"
            >
              {ctaText}
            </Link>
          )}

          {contactInfo && (
            <p className="text-xs sm:text-sm text-gray-500 pt-2">
              {contactInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionPopup;
