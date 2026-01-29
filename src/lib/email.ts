import emailjs from '@emailjs/browser';
import { CartItem } from '../context/CartContext';
import { SIZE_OPTIONS } from './constants';

// EmailJS configuration constants
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const SHOP_EMAIL = import.meta.env.VITE_SHOP_EMAIL || 'info@magnoliaflowers.com.au';

// Order data interface
export interface OrderData {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  recipientDetails?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    state?: string;
    postcode?: string;
    message?: string;
  };
  cartItems: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  orderDetails: string;
  totalFormatted: string;
  taxFormatted: string;
  shippingFormatted: string;
}

/**
 * Calculate the display price for a cart item
 * Uses sale_price if available and lower, otherwise uses price
 */
const getDisplayPrice = (item: CartItem): number => {
  return item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
};

/**
 * Get size premium price based on selected size
 */
const getSizePremium = (size: string): number => {
  const sizeOption = SIZE_OPTIONS.find(opt => opt.name === size);
  return sizeOption ? sizeOption.extraPrice : 0;
};

/**
 * Calculate the final price per unit for an item
 * This includes base price + size premium
 * Note: If the CartItem already has the final calculated price, we use that
 * Otherwise, we calculate base + size premium
 */
const getItemUnitPrice = (item: CartItem): number => {
  const basePrice = getDisplayPrice(item);
  const sizePremium = getSizePremium(item.selectedSize);
  return basePrice + sizePremium;
};

/**
 * Get a valid image URL for email display
 * Ensures the URL is absolute and accessible
 */
const getValidImageUrl = (imagePath: string | null | undefined): string => {
  // Fallback image URL (a nice generic flower image)
  const fallbackImageUrl = 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&w=200&q=80';
  
  // If no image path provided, return fallback
  if (!imagePath || imagePath.trim() === '') {
    return fallbackImageUrl;
  }
  
  // If already a full HTTP/HTTPS URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path or Supabase storage path, try to construct full URL
  // Supabase storage paths typically start with '/storage/v1/object/public/'
  // Or might be stored as relative paths that need the Supabase URL prepended
  const supabaseUrl = 'https://rfalymblhmqkjgajlktp.supabase.co';
  
  // Check if it looks like a Supabase storage path
  if (imagePath.startsWith('/storage/') || imagePath.startsWith('storage/')) {
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${supabaseUrl}${cleanPath}`;
  }
  
  // If it's a relative path, try prepending Supabase URL
  if (imagePath.startsWith('/')) {
    return `${supabaseUrl}${imagePath}`;
  }
  
  // For any other format, return fallback to prevent broken images
  return fallbackImageUrl;
};

/**
 * Send order confirmation emails using EmailJS
 * Matches the EmailJS template structure with orders loop and cost object
 */
export const sendOrderEmails = async (orderData: OrderData): Promise<void> => {
  try {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      console.error('Email skipped due to missing config');
      return;
    }

    // Build the orders array matching the {{#orders}} loop in EmailJS template
    const orders = orderData.cartItems.map((item) => {
      const unitPrice = getItemUnitPrice(item);
      const imageUrl = getValidImageUrl(item.images?.[0]);

      return {
        name: `${item.name} (${item.selectedSize})`,
        price: `$${unitPrice.toFixed(2)}`,
        units: item.quantity,
        image: imageUrl,
      };
    });

    // Build the cost object matching {{cost.xxx}} in EmailJS template
    const cost = {
      shipping: orderData.shippingFormatted,
      tax: orderData.taxFormatted,
      total: orderData.totalFormatted,
    };

    // Build template parameters matching the EmailJS template structure
    const templateParams = {
      order_id: String(orderData.id),
      email: orderData.email,
      to_name: `${orderData.firstName ?? ''} ${orderData.lastName ?? ''}`.trim() || 'Customer',
      total_amount: orderData.totalFormatted,
      total_amount_formatted: orderData.totalFormatted,
      tax_formatted: orderData.taxFormatted,
      shipping_formatted: orderData.shippingFormatted,
      order_details: orderData.orderDetails,
      phone: orderData.phone || '',
      orders: orders,
      cost: cost,
      reply_to: SHOP_EMAIL,
      from_name: 'Magnolia Flower Team',
    };

    // Debug: Log email payload items to inspect image URLs
    console.log('Email Payload Items:', templateParams.orders);

    // Send email via EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Order confirmation email sent successfully:', response);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
};
