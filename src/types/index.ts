export interface Category {
  id: string;
  name: string;
  slug?: string | null;
}

export interface Product {
  id: number | string;
  name: string;
  price: number;
  sale_price?: number | null;
  description?: string | null;
  images?: string[] | null;
  in_stock?: boolean;
  sku?: string | null;
  slug?: string;
  has_extras?: boolean;
  sort_order?: number;
  categories?: Category[];
  category?: Category | null;
  /** When true (default), show Regular / Premium / Platinum size selector. When false, show Standard only. */
  has_sizes?: boolean;
  /** Absolute price for Premium size when has_sizes is true. If null, frontend uses price * 1.3. */
  price_premium?: number | null;
  /** Absolute price for Platinum size when has_sizes is true. If null, frontend uses price * 1.6. */
  price_platinum?: number | null;
}

export interface Promotion {
  id: number;
  shop_name: string | null;
  title: string | null;
  cta_text: string | null;
  cta_link: string | null;
  contact_info: string | null;
  image_url: string | null;
  is_active: boolean;
  /** When true, show the CTA button (Shop Now). When false, only title/image/message are shown. */
  show_button?: boolean;
  created_at?: string;
}
