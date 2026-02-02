import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Truck, Store, Phone } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import emailjs from '@emailjs/browser';
import Header from '../components/Header';
import StripePaymentForm from '../components/Checkout/StripePaymentForm';
import { useCart, CartItem } from '../context/CartContext';
import { OrderData } from '../lib/email';
import { supabase } from '../lib/supabase';
import { useShopDates } from '../hooks/useShopDates';
import PostcodeCombobox, { DELIVERY_ZONES } from '../components/ui/PostcodeCombobox';
import NewOrderEmail from '../emails/NewOrderEmail';
import { getDisplayOrderId } from '../lib/orderId';

// Address data interface
interface AddressData {
  firstName: string;
  lastName: string;
  address: string;
  state: string;
  postcode: string;
  phone: string;
}

interface CouponData {
  code: string;
  discount_type: string;
  value: number;
}

type SecurityLogEntry = {
  id: number;
  timestamp: string;
  action: string;
  details?: Record<string, unknown>;
};

interface OrderInfoPreviewProps {
  className?: string;
  cartItems: CartItem[];
  subtotal: number;
  isMultiToAddress: boolean;
  totalQuantity: number;
  isMultiShipping: boolean;
  currentShippingFee: number;
  seasonalSurcharge: number;
  getDisplayPrice: (item: CartItem) => number;
  getImageUrl: (item: CartItem) => string;
}

interface PaymentActionsProps {
  appliedCoupon: CouponData | null;
  couponCode: string;
  onCouponChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  discountAmount: number;
  finalTotal: number;
  totalGST: number;
  isFormValid: boolean;
  hasOtherState: boolean;
  isPaymentLoading: boolean;
  paymentError: string | null;
  clientSecret: string | null;
  shouldRenderForm: boolean;
  fetchClientSecret: () => void;
  handlePaymentSuccess: () => void;
  validateForm: () => Record<string, boolean>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  scrollToFirstError: (errors: Record<string, boolean>) => void;
  validateAllSteps: () => {
    isValid: boolean;
    errors: Record<string, string>;
    errorStep: 1 | 2 | 3 | null;
  };
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

// Shop information
const SHOP_INFO = {
  address: "127 Canterbury Rd, Blackburn South VIC 3130",
  phone: "03 9877 3164",
  email: "magnoliaflowers.au@gmail.com",
};

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const OrderInfoPreview: React.FC<OrderInfoPreviewProps> = ({
  className = '',
  cartItems,
  subtotal,
  isMultiToAddress,
  totalQuantity,
  isMultiShipping,
  currentShippingFee,
  seasonalSurcharge,
  getDisplayPrice,
  getImageUrl,
}) => (
  <div className={`bg-stone-50 p-6 rounded-lg border border-stone-200 ${className}`}>
    <h2 className="text-lg font-serif font-bold mb-5 text-stone-900">
      Order Summary
    </h2>

    {/* Product List */}
    <div className="space-y-4 mb-6">
      {cartItems.map((item) => {
        const displayPrice = getDisplayPrice(item);
        return (
          <div key={`${item.id}-${item.selectedSize}`} className="flex gap-3">
            <img
              src={getImageUrl(item)}
              alt={item.name}
              className="w-16 h-16 object-cover rounded bg-gray-100 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-900 text-sm font-sans truncate">
                {item.name}
              </p>
              <p className="text-xs text-gray-500 font-sans">
                Qty: {item.quantity} × ${displayPrice.toFixed(2)}
              </p>
            </div>
          </div>
        );
      })}
    </div>

    {/* Divider */}
    <div className="border-t border-stone-200 my-4"></div>

    {/* Cost Breakdown */}
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 font-sans">Subtotal</span>
        <span className="font-medium text-stone-900 font-sans">
          ${subtotal.toFixed(2)}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-gray-600 font-sans">
          {isMultiToAddress
            ? `Shipping (x${totalQuantity} destinations)`
            : 'Shipping'}
          {isMultiShipping && currentShippingFee > 0 && (
            <span className="text-xs text-gray-500 ml-1 block mt-1">
              (Multiple addresses)
            </span>
          )}
        </span>
        <span className="font-medium text-stone-900 font-sans">
          {currentShippingFee === 0 ? 'Free' : `$${currentShippingFee.toFixed(2)}`}
        </span>
      </div>

      {seasonalSurcharge > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-amber-600 font-sans">Seasonal Surcharge</span>
          <span className="font-medium text-amber-600 font-sans">
            +${seasonalSurcharge.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  </div>
);

const PaymentActions: React.FC<PaymentActionsProps> = ({
  appliedCoupon,
  couponCode,
  onCouponChange,
  onApplyCoupon,
  onRemoveCoupon,
  discountAmount,
  finalTotal,
  totalGST,
  isFormValid,
  hasOtherState,
  isPaymentLoading,
  paymentError,
  clientSecret,
  shouldRenderForm,
  fetchClientSecret,
  handlePaymentSuccess,
  validateForm,
  setFormErrors,
  scrollToFirstError,
  validateAllSteps,
  setErrors,
}) => (
  <div>
    {/* Coupon */}
    <div className="mb-6 space-y-3">
      {!appliedCoupon ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => onCouponChange(e.target.value)}
            placeholder="Enter discount code"
            className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm font-sans focus:border-stone-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={onApplyCoupon}
            className="rounded bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition font-sans"
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 font-sans">
          <span>
            ✅ Code "{appliedCoupon.code}" applied (-${discountAmount.toFixed(2)})
          </span>
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="text-green-700 underline hover:text-green-800"
          >
            Remove
          </button>
        </div>
      )}
    </div>

    {discountAmount > 0 && (
      <div className="flex justify-between items-center text-sm mb-4">
        <span className="text-red-600 font-sans">Discount</span>
        <span className="font-medium text-red-600 font-sans">
          -${discountAmount.toFixed(2)}
        </span>
      </div>
    )}

    {/* Total */}
    <div className="flex justify-between items-center mb-6">
      <span className="text-xl font-bold text-stone-900 font-sans">
        Total
      </span>
      <span className="text-xl font-bold text-stone-900 font-sans">
        ${finalTotal.toFixed(2)}
      </span>
    </div>
    <p className="text-xs text-gray-500 font-sans text-right mb-6">
      (Includes GST: ${totalGST.toFixed(2)})
    </p>

    <div className="border-t border-stone-200 my-6"></div>

    {isFormValid ? (
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">Payment Method</h2>
        </div>
        <div className="px-6 pb-6 pt-5">
          {hasOtherState ? (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-sans mb-2">
                <strong>Order cannot be placed online</strong> for deliveries outside Victoria. Please contact us to arrange your order.
              </p>
              <div className="space-y-1 text-sm text-amber-900 font-sans">
                <p><strong>Phone:</strong> <a href={`tel:${SHOP_INFO.phone.replace(/\s/g, '')}`} className="underline hover:text-amber-700">{SHOP_INFO.phone}</a></p>
                <p><strong>Email:</strong> <a href={`mailto:${SHOP_INFO.email}`} className="underline hover:text-amber-700">{SHOP_INFO.email}</a></p>
              </div>
            </div>
          ) : (
            <>
              {isPaymentLoading && (
                <div className="rounded-lg border border-stone-200 bg-white px-4 py-4 text-sm text-stone-700 flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                  Initializing secure payment...
                </div>
              )}
              {paymentError && !isPaymentLoading && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-3">
                  <p>{paymentError}</p>
                  <button
                    type="button"
                    onClick={fetchClientSecret}
                    className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                  >
                    Retry Payment
                  </button>
                </div>
              )}
              {shouldRenderForm && clientSecret && (
                <StripePaymentForm
                  amount={finalTotal}
                  clientSecret={clientSecret}
                  isProcessing={isPaymentLoading}
                  onSuccess={handlePaymentSuccess}
                  onValidate={() => {
                    const requiredErrors = validateForm();
                    setFormErrors(requiredErrors);
                    if (Object.keys(requiredErrors).length > 0) {
                      scrollToFirstError(requiredErrors);
                      return false;
                    }
                    const validation = validateAllSteps();
                    if (!validation.isValid) {
                      setErrors(validation.errors);
                      return false;
                    }
                    setErrors({});
                    return true;
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    ) : (
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 font-sans text-center">
        * Please fill in all mandatory fields (Email, Phone) to proceed to payment.
      </div>
    )}
  </div>
);


const CheckoutPage: React.FC = () => {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Shipping method state
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');
  
  // Multi-shipping state
  const [isMultiShipping, setIsMultiShipping] = useState(false);
  const [isMultiToAddress, setIsMultiToAddress] = useState(false);
  const [splitShipments, setSplitShipments] = useState<Record<string, AddressData>>({});
  const [multiAddresses, setMultiAddresses] = useState<Record<string, AddressData>>({});
  const [multiDeliveryDates, setMultiDeliveryDates] = useState<Record<string, string>>({});
  
  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Error state for validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const lastPaymentAmountRef = useRef<number | null>(null);
  const hasOtherStateRef = useRef<boolean>(false);
  const isStep2ValidRef = useRef<boolean>(false);
  const clientSecretRef = useRef<string | null>(null);
  const transactionIdRef = useRef<number | null>(null);

  console.log("🎨 [CheckoutPage Render] State:", {
    clientSecret: !!clientSecret,
    isPaymentLoading,
    paymentError,
  });
  const shouldRenderForm = Boolean(clientSecret && !paymentError);
  console.log("Rendering StripeForm?:", shouldRenderForm);
  
  // Get passed state from Cart page
  const passedState = location.state as {
    deliveryMethod?: 'delivery' | 'pickup';
    shippingAddress?: { state: string; suburb: string; postcode: string };
  } | null;

  // Single address form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [recipientFirstName, setRecipientFirstName] = useState('');
  const [recipientLastName, setRecipientLastName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isRecipientSameAsSender, setIsRecipientSameAsSender] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');
  const [itemMessages, setItemMessages] = useState<Record<string, string>>({});
  const [address, setAddress] = useState('');
  const [state, setState] = useState('VIC'); // Default to Victoria
  const [selectedPostcode, setSelectedPostcode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryZonePrice, setDeliveryZonePrice] = useState<number | null>(null);

  const getNextTransactionId = (): number => {
    if (typeof window === 'undefined') return 7001;
    const storageKey = 'transactionIdCounter';
    const storedValue = window.localStorage.getItem(storageKey);
    const currentValue = storedValue ? parseInt(storedValue, 10) : 7000;
    const safeCurrent = Number.isFinite(currentValue) && currentValue >= 7000 ? currentValue : 7000;
    const nextValue = safeCurrent + 1;
    window.localStorage.setItem(storageKey, String(nextValue));
    return nextValue;
  };

  const getCurrentTransactionId = (): number => {
    if (!transactionIdRef.current) {
      transactionIdRef.current = getNextTransactionId();
    }
    return transactionIdRef.current;
  };

  const logSecurityEvent = (action: string, details?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const logId = getCurrentTransactionId();
    const entry: SecurityLogEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      action,
      details,
    };

    const storageKey = 'securityLogs';
    const storedLogs = window.localStorage.getItem(storageKey);
    let logs: SecurityLogEntry[] = [];
    if (storedLogs) {
      try {
        logs = JSON.parse(storedLogs);
      } catch {
        logs = [];
      }
    }
    logs.push(entry);
    const MAX_LOGS = 5000;
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }
    window.localStorage.setItem(storageKey, JSON.stringify(logs));
    console.log(`[Security Log #${logId}] ${action}`, details ?? '');
  };
  
  // Date management hook
  const { checkIsSeasonal, checkIsClosed, getSurcharge, isDateAvailable } = useShopDates();
  
  // Initialize shipping method from passed state
  useEffect(() => {
    if (passedState?.deliveryMethod) {
      setShippingMethod(passedState.deliveryMethod);
    }
  }, [passedState]);

  // Helper to generate unique key for expanded item (for multi-shipping)
  const getExpandedItemKey = (item: CartItem, index: number): string => {
    return `${item.id}-${item.selectedSize}-${index}`;
  };

  const getSplitItemKey = (item: CartItem, index: number): string => {
    return `${item.id}-${item.selectedSize}-${index}`;
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  // Calculate total quantity of items in cart
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Generate expanded items list for multi-shipping (one form per quantity unit)
  const expandedItems = isMultiShipping
    ? cartItems.flatMap((item) =>
        Array.from({ length: item.quantity }, (_, index) => ({
          item,
          index,
          key: getExpandedItemKey(item, index),
        }))
      )
    : [];

  // Auto-fill form from passed state (if postcode was passed from cart)
  useEffect(() => {
    if (passedState?.shippingAddress?.postcode) {
      const postcode = passedState.shippingAddress.postcode;
      const zone = DELIVERY_ZONES.find((z) => z.postcode === postcode);
      if (zone) {
        setSelectedPostcode(postcode);
        setDeliveryZonePrice(zone.price);
      }
    }
  }, [passedState]);

  useEffect(() => {
    if (shippingMethod !== 'delivery') return;
    if (!selectedPostcode) return;
    console.log('Calculating shipping for suburb:', selectedPostcode);
  }, [selectedPostcode, shippingMethod]);

  useEffect(() => {
    if (shippingMethod === 'pickup' && isMultiToAddress) {
      setIsMultiToAddress(false);
    }
  }, [isMultiToAddress, shippingMethod]);

  // Initialize multiAddresses and delivery dates when isMultiShipping is enabled
  useEffect(() => {
    if (isMultiShipping) {
      const initialAddresses: Record<string, AddressData> = {};
      const initialDates: Record<string, string> = {};
      
      // Expand items by quantity
      cartItems.forEach((item) => {
        for (let index = 0; index < item.quantity; index++) {
          const expandedKey = getExpandedItemKey(item, index);
          
          // Preserve existing address if set, otherwise initialize
          if (multiAddresses[expandedKey]) {
            initialAddresses[expandedKey] = multiAddresses[expandedKey];
          } else {
            initialAddresses[expandedKey] = {
              firstName: '',
              lastName: '',
              address: '',
              state: 'VIC',
              postcode: '',
              phone: '',
            };
          }
          
          // Preserve existing delivery date if set
          if (multiDeliveryDates[expandedKey]) {
            initialDates[expandedKey] = multiDeliveryDates[expandedKey];
          }
        }
      });
      
      setMultiAddresses(initialAddresses);
      setMultiDeliveryDates(initialDates);
    }
  }, [isMultiShipping, cartItems]);

  useEffect(() => {
    if (!isMultiToAddress) return;
    const initialSplitShipments: Record<string, AddressData> = {};
    const expandedForSplit = cartItems.flatMap((item) =>
      Array.from({ length: item.quantity }, (_, index) => ({
        item,
        index,
      }))
    );

    expandedForSplit.forEach(({ item, index }) => {
      const splitKey = getSplitItemKey(item, index);
      initialSplitShipments[splitKey] = splitShipments[splitKey] || {
        firstName: '',
        lastName: '',
        address: '',
        state: 'VIC',
        postcode: '',
        phone: '',
      };
    });

    setSplitShipments(initialSplitShipments);
  }, [cartItems, isMultiToAddress]);

  // Force single address mode if total quantity is 1 or less
  useEffect(() => {
    if (totalQuantity <= 1 && isMultiShipping) {
      setIsMultiShipping(false);
    }
  }, [totalQuantity, isMultiShipping]);

  const updateSplitShipment = (itemKey: string, field: keyof AddressData, value: string) => {
    setSplitShipments((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [field]: value,
      },
    }));
  };

  // Helper function to get image URL
  const getImageUrl = (item: typeof cartItems[0]): string => {
    if (item.images && item.images.length > 0) {
      return item.images[0];
    }
    return 'https://via.placeholder.com/400x400?text=No+Image';
  };

  const buildSelectedOptions = (item: CartItem): Record<string, any> | null => {
    if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
      return item.selectedOptions;
    }

    const fallbackOptions: Record<string, any> = {};
    if (item.selectedSize) {
      fallbackOptions.Size = item.selectedSize;
    }
    if (item.message) {
      fallbackOptions.Message = item.message;
    }

    return Object.keys(fallbackOptions).length > 0 ? fallbackOptions : null;
  };

  const buildRecipientInfoFromSplit = (shipment: AddressData | undefined, message?: string) => {
    if (!shipment) return null;
    const name = `${shipment.firstName ?? ''} ${shipment.lastName ?? ''}`.trim();
    return {
      name: name || undefined,
      address: shipment.address || undefined,
      suburb: shipment.postcode || undefined,
      state: shipment.state || undefined,
      phone: shipment.phone || undefined,
      message: message?.trim() || undefined,
    };
  };

  const buildRecipientInfoFromMain = () => {
    const hasMessage = globalMessage.trim();
    if (shippingMethod !== 'delivery' && !hasMessage) return null;
    const name = `${recipientFirstName ?? ''} ${recipientLastName ?? ''}`.trim();
    return {
      name: name || undefined,
      address: address || undefined,
      suburb: selectedPostcode || undefined,
      state: state || undefined,
      phone: recipientPhone || undefined,
      message: hasMessage || undefined,
    };
  };

  const getSuburbFromPostcode = (postcode?: string): string | undefined => {
    if (!postcode) return undefined;
    const zone = DELIVERY_ZONES.find((z) => z.postcode === postcode);
    if (!zone) return undefined;
    const match = zone.label.match(/^\d+\s*-\s*(.+)/);
    return match ? match[1] : zone.label;
  };

  const updateItemMessage = (splitKey: string, value: string) => {
    setItemMessages((prev) => ({
      ...prev,
      [splitKey]: value,
    }));
  };

  // Helper function to get display price
  const getDisplayPrice = (item: typeof cartItems[0]): number => {
    return item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
  };

  // Calculate item total
  const getItemTotal = (item: typeof cartItems[0]): number => {
    return getDisplayPrice(item) * item.quantity;
  };

  // Calculate cart totals with GST
  const subtotal = cartItems.reduce((sum, item) => sum + getItemTotal(item), 0);

  // Shipping fee calculation (reactive)
  const BASE_SHIPPING_RATE = deliveryZonePrice ?? 0;
  const currentShippingFee = useMemo(() => {
    if (shippingMethod === 'pickup') return 0;
    if (isMultiToAddress) {
      return Object.values(splitShipments).reduce((total, shipment) => {
        if (!shipment.postcode || shipment.postcode === 'other' || shipment.state !== 'VIC') {
          return total;
        }
        const zone = DELIVERY_ZONES.find((z) => z.postcode === shipment.postcode);
        return total + (zone ? zone.price : 0);
      }, 0);
    }
    return BASE_SHIPPING_RATE;
  }, [BASE_SHIPPING_RATE, isMultiToAddress, shippingMethod, splitShipments]);
  
  // Add seasonal surcharge if delivery date is seasonal (only for single address)
  const seasonalSurcharge = deliveryDate && shippingMethod === 'delivery' && !isMultiShipping
    ? getSurcharge(deliveryDate) 
    : 0;
  
  const shippingCost = currentShippingFee + seasonalSurcharge;
  const baseTotal = subtotal + shippingCost;
  const discountAmountInCents = useMemo(() => {
    if (!appliedCoupon) {
      return Math.round(discountAmount * 100);
    }

    const type = String(appliedCoupon.discount_type).toLowerCase().trim();
    if (type === 'fixed') {
      return Math.round(appliedCoupon.value * 100);
    }
    if (type === 'percent' || type === 'percentage') {
      return Math.round(((subtotal * appliedCoupon.value) / 100) * 100);
    }
    return Math.round(discountAmount * 100);
  }, [appliedCoupon, discountAmount, subtotal]);

  const finalTotal = Math.max(baseTotal - discountAmount, 0);
  const totalGST = finalTotal / 11;
  const amountInCents = useMemo(
    () => Math.max(Math.round(baseTotal * 100) - discountAmountInCents, 0),
    [baseTotal, discountAmountInCents]
  );

  // Check if any address has "Other" state (blocks order placement)
  const hasOtherState = shippingMethod === 'delivery'
    ? isMultiShipping
      ? Object.values(multiAddresses).some(addr => addr.state === 'OTHER')
      : state === 'OTHER'
    : false;

  useEffect(() => {
    hasOtherStateRef.current = hasOtherState;
  }, [hasOtherState]);

  const isEmailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);

  const isFormValid = useMemo(() => {
    const safeEmail = (email ?? '').trim();
    const safePhone = (phone ?? '').trim();
    const hasContact = safeEmail.length > 0 && safePhone.length > 0;
    if (!hasContact) {
      return false;
    }

    if (!isMultiToAddress) {
      return true;
    }

    const splitItems = cartItems.flatMap((item) =>
      Array.from({ length: item.quantity }, (_, index) => ({
        key: getSplitItemKey(item, index),
      }))
    );

    const allItemsValid = splitItems.every(({ key }) => {
      const splitAddress = splitShipments[key];
      const hasPhone = Boolean((splitAddress?.phone ?? '').trim());
      const hasState = Boolean((splitAddress?.state ?? '').trim());
      const hasSuburb = Boolean((splitAddress?.postcode ?? '').trim());
      return hasPhone && hasState && hasSuburb;
    });

    return allItemsValid;
  }, [cartItems, email, isMultiToAddress, phone, splitShipments]);

  useEffect(() => {
    if (isRecipientSameAsSender) {
      setRecipientFirstName(firstName);
      setRecipientLastName(lastName);
      setRecipientPhone(phone);
    }
  }, [firstName, lastName, phone, isRecipientSameAsSender]);

  useEffect(() => {
    if (!isRecipientSameAsSender) {
      setRecipientFirstName('');
      setRecipientLastName('');
      setRecipientPhone('');
    }
  }, [isRecipientSameAsSender]);

  const areMultiDatesValid = useMemo(() => {
    if (!isMultiShipping) return true;
    return expandedItems.every(({ key: expandedKey }) => {
      const selectedDate = multiDeliveryDates[expandedKey];
      return !selectedDate || isDateAvailable(selectedDate);
    });
  }, [expandedItems, isDateAvailable, isMultiShipping, multiDeliveryDates]);

  const isStep2Valid = useMemo(() => {
    if (isMultiShipping) {
      return areMultiDatesValid;
    }
    const isDateValid = !deliveryDate || isDateAvailable(deliveryDate);
    return isDateValid;
  }, [
    areMultiDatesValid,
    deliveryDate,
    isDateAvailable,
    isMultiShipping,
  ]);

  useEffect(() => {
    isStep2ValidRef.current = isStep2Valid;
  }, [isStep2Valid]);

  useEffect(() => {
    clientSecretRef.current = clientSecret;
  }, [clientSecret]);

  const clearFormError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const scrollToFirstError = (newErrors: Record<string, boolean>) => {
    const fields = Object.keys(newErrors);
    if (fields.length === 0) return;
    const element = document.getElementById(fields[0]);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};

    if (!email.trim()) newErrors.email = true;
    if (!phone.trim()) newErrors.phone = true;

    return newErrors;
  };

  const handleApplyCoupon = async () => {
    const trimmedCode = couponCode.trim().toUpperCase();
    if (!trimmedCode) {
      alert('Vui lòng nhập mã giảm giá.');
      return;
    }

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', trimmedCode)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('Coupon lookup failed:', error);
      alert('Mã giảm giá không hợp lệ');
      return;
    }

    const coupon = data?.[0] as CouponData | undefined;
    if (!coupon) {
      alert('Mã giảm giá không hợp lệ');
      return;
    }

    const type = String(coupon.discount_type).toLowerCase().trim();
    const normalizedType = type === 'percent' || type === 'percentage'
      ? 'percent'
      : type === 'fixed' || type === 'amount'
        ? 'fixed'
        : 'fixed';
    const rawValue = Number(coupon.value);
    let calculatedDiscount = 0;

    if (normalizedType === 'percent') {
      const percentValue = rawValue <= 1 ? rawValue * 100 : rawValue;
      calculatedDiscount = (subtotal * percentValue) / 100;
    } else {
      const fixedValue = rawValue <= 1 ? rawValue * 100 : rawValue;
      calculatedDiscount = fixedValue;
    }

    if (calculatedDiscount > subtotal) {
      calculatedDiscount = subtotal;
    }

    const roundedDiscount = Math.round(calculatedDiscount * 100) / 100;

    setAppliedCoupon(coupon);
    setDiscountAmount(roundedDiscount);
    setCouponCode(trimmedCode);
    alert('Coupon code applied successfully!');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
  };

  const fetchClientSecret = async () => {
    if (isPaymentLoading) return;
    setIsPaymentLoading(true);
    setPaymentError(null);

    try {
      logSecurityEvent('Payment intent requested', { amountInCents });
      console.log('[PaymentIntent] Requesting client secret', {
        amountInCents,
        isStep2Valid: isStep2ValidRef.current,
        hasOtherState: hasOtherStateRef.current,
      });
      const { data, error: invokeError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: { amount: amountInCents },
        }
      );

      if (invokeError) {
        console.error('Payment intent API error:', invokeError);
        throw new Error(invokeError.message || 'Unable to initialize payment.');
      }

      console.log('[PaymentIntent] Response', {
        hasClientSecret: Boolean(data?.clientSecret),
        clientSecretPrefix: typeof data?.clientSecret === 'string'
          ? `${data.clientSecret.slice(0, 6)}...`
          : null,
        clientSecretLength: typeof data?.clientSecret === 'string'
          ? data.clientSecret.length
          : null,
        clientSecretHasSecret: typeof data?.clientSecret === 'string'
          ? data.clientSecret.includes('_secret_')
          : null,
      });
      logSecurityEvent('Payment intent received', {
        amountInCents,
        hasClientSecret: Boolean(data?.clientSecret),
      });
      setClientSecret(data?.clientSecret ?? null);
      lastPaymentAmountRef.current = amountInCents;
    } catch (err) {
      logSecurityEvent('Payment intent failed', {
        amountInCents,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error('Payment intent request failed:', err);
      setClientSecret(null);
      setPaymentError(err instanceof Error ? err.message : 'Unable to initialize payment.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  useEffect(() => {
    console.log('[PaymentIntent] effect', {
      amountInCents,
      isStep2Valid: isStep2ValidRef.current,
      hasOtherState: hasOtherStateRef.current,
      lastAmount: lastPaymentAmountRef.current,
      hasClientSecret: Boolean(clientSecretRef.current),
    });
    if (!isStep2ValidRef.current || hasOtherStateRef.current) {
      setClientSecret(null);
      setPaymentError(null);
      return;
    }

    if (!amountInCents || amountInCents <= 0) {
      setClientSecret(null);
      setPaymentError('Payment amount is invalid.');
      return;
    }

    if (lastPaymentAmountRef.current === amountInCents && clientSecretRef.current) {
      return;
    }

    fetchClientSecret();
  }, [amountInCents]);

  // Validation function - called only when Pay button is clicked
  const validateAllSteps = (): { isValid: boolean; errors: Record<string, string>; errorStep: 1 | 2 | 3 | null } => {
    const newErrors: Record<string, string> = {};
    let errorStep: 1 | 2 | 3 | null = null;

    // Validate Step 1
    if (!isEmailValid) {
      newErrors.email = 'Please enter a valid email address';
      if (!errorStep) errorStep = 1;
    }
    if (!phone || phone.trim().length < 9) {
      newErrors.phone = 'Please enter a valid phone number (at least 9 digits)';
      if (!errorStep) errorStep = 1;
    }

    if (isMultiShipping) {
      expandedItems.forEach(({ key: expandedKey, item }) => {
        const selectedDate = multiDeliveryDates[expandedKey];
        if (selectedDate && !isDateAvailable(selectedDate)) {
          newErrors[`${expandedKey}-date`] = `Selected date is not available for ${item.name}`;
          if (!errorStep) errorStep = 2;
        }
      });
    } else if (isMultiToAddress && shippingMethod === 'delivery') {
      const splitItems = cartItems.flatMap((item) =>
        Array.from({ length: item.quantity }, (_, index) => ({
          item,
          key: getSplitItemKey(item, index),
        }))
      );
      splitItems.forEach(({ key: splitKey, item }) => {
        const splitAddress = splitShipments[splitKey];
        if (!splitAddress?.phone || splitAddress.phone.trim().length === 0) {
          newErrors[`${splitKey}-phone`] = `Recipient phone is required for ${item.name}`;
          if (!errorStep) errorStep = 2;
        }
        if (!splitAddress?.state) {
          newErrors[`${splitKey}-state`] = `State is required for ${item.name}`;
          if (!errorStep) errorStep = 2;
        }
        if (splitAddress?.state === 'VIC' && (!splitAddress?.postcode || splitAddress.postcode === 'other')) {
          newErrors[`${splitKey}-postcode`] = `Suburb / postcode is required for ${item.name}`;
          if (!errorStep) errorStep = 2;
        }
      });
    } else if (deliveryDate && !isDateAvailable(deliveryDate)) {
      newErrors.deliveryDate = 'Selected date is not available';
      if (!errorStep) errorStep = 2;
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
      errorStep,
    };
  };

  const handlePaymentSuccess = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    logSecurityEvent('Payment confirmed', { amountInCents });

    if (!email || !phone) {
      alert('Please enter your email and phone number before paying.');
      setIsProcessing(false);
      return;
    }

    // Validate all steps before processing payment
    const validation = validateAllSteps();
    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsProcessing(false);
      return;
    }

    // Clear any previous errors
    setErrors({});

    try {
      const newOrder: any = {
        total_amount: finalTotal,
        coupon_code: appliedCoupon?.code ?? null,
        discount_total: discountAmount,
        final_amount: finalTotal,
        email: email,
        status: 'Pending',
        shipping_method: shippingMethod,
      };

      if (isMultiShipping) {
        const customerDetails: any = {
          email: email,
          addresses: expandedItems.map(({ item, index, key: expandedKey }) => {
            const addr = multiAddresses[expandedKey];
            const deliveryDate = multiDeliveryDates[expandedKey];
            return {
              itemId: item.id,
              itemName: item.name,
              itemIndex: index + 1,
              totalQuantity: item.quantity,
              size: item.selectedSize,
              address: addr,
              deliveryDate: deliveryDate,
            };
          }),
        };
        newOrder.customer_details = customerDetails;
      } else {
        newOrder.first_name = firstName;
        newOrder.last_name = lastName;
        newOrder.recipient_details = shippingMethod === 'delivery'
          ? {
              firstName: recipientFirstName,
              lastName: recipientLastName,
              phone: recipientPhone,
              address: address,
              state: state,
              postcode: selectedPostcode,
              message: globalMessage.trim() || '',
            }
          : null;
        newOrder.customer_details = {
          email: email,
          sender: {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
          },
          recipient: {
            firstName: recipientFirstName,
            lastName: recipientLastName,
            phone: recipientPhone,
          },
          address: address,
          state: state,
          postcode: selectedPostcode,
        };
      }

      console.log('=== PLACING ORDER ===');
      console.log('Preparing to insert order:', newOrder);
      console.log('Order payload (JSON):', JSON.stringify(newOrder, null, 2));

      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert([newOrder])
        .select();

      if (insertError) {
        logSecurityEvent('Order insert failed', { error: insertError.message });
        console.error('%cCRITICAL SUPABASE ERROR:', 'color: red; font-size: 16px; font-weight: bold;');
        console.error('Error object:', insertError);
        console.error('Error message:', insertError.message);
        console.error('Error details:', insertError.details);
        console.error('Error hint:', insertError.hint);
        console.error('Error code:', insertError.code);

        alert(`Lỗi lưu đơn hàng: ${insertError.message}\n\nChi tiết: ${insertError.details || 'Không có thông tin chi tiết'}`);
        return;
      }

      console.log('Insert Success:', insertedOrder);
      const orderId = insertedOrder?.[0]?.id;
      console.log('Inserted order ID:', orderId);
      logSecurityEvent('Order created', { orderId });

      if (!orderId) {
        throw new Error('Failed to retrieve order ID after insert.');
      }

      const orderItemsPayload = isMultiToAddress
        ? cartItems.flatMap((item) =>
            Array.from({ length: item.quantity }, (_, index) => {
              const splitKey = getSplitItemKey(item, index);
              const splitShipment = splitShipments[splitKey];
              return {
                order_id: orderId,
                product_id: item.id,
                product_name: `${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''}`,
                quantity: 1,
                price: getDisplayPrice(item),
                image_url: getImageUrl(item),
                selected_options: buildSelectedOptions(item),
                recipient_info: buildRecipientInfoFromSplit(splitShipment, itemMessages[splitKey]),
              };
            })
          )
        : cartItems.map((item) => ({
            order_id: orderId,
            product_id: item.id,
            product_name: `${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''}`,
            quantity: item.quantity,
            price: getDisplayPrice(item),
            image_url: getImageUrl(item),
            selected_options: buildSelectedOptions(item),
            recipient_info: buildRecipientInfoFromMain(),
          }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (orderItemsError) {
        logSecurityEvent('Order items insert failed', { error: orderItemsError.message });
        console.error('Error inserting order items:', orderItemsError);
        throw new Error('Failed to save order items.');
      }

      const orderDetails = cartItems
        .map((item) => {
          const unitPrice = getDisplayPrice(item);
          return `${item.quantity}x ${item.name} (${formatCurrency(unitPrice)})`;
        })
        .join(', ');

      const rawOrderId = insertedOrder?.[0]?.id || `ORDER-${Date.now()}`;
      const displayOrderId = getDisplayOrderId(rawOrderId);
      const orderData: OrderData = {
        id: displayOrderId,
        email: email,
        firstName: isMultiShipping
          ? multiAddresses[expandedItems[0]?.key]?.firstName
          : firstName,
        lastName: isMultiShipping
          ? multiAddresses[expandedItems[0]?.key]?.lastName
          : lastName,
        phone: isMultiShipping
          ? multiAddresses[expandedItems[0]?.key]?.phone
          : phone,
        recipientDetails: shippingMethod === 'delivery'
          ? {
              firstName: recipientFirstName,
              lastName: recipientLastName,
              phone: recipientPhone,
              address: address,
              state: state,
              postcode: selectedPostcode,
              message: globalMessage.trim() || '',
            }
          : undefined,
        cartItems: cartItems,
        subtotal: subtotal,
        shipping: shippingCost,
        tax: totalGST,
        total: finalTotal,
        orderDetails: orderDetails,
        totalFormatted: formatCurrency(finalTotal),
        taxFormatted: formatCurrency(totalGST),
        shippingFormatted: formatCurrency(shippingCost),
      };

      console.log('Order data for email:', orderData);

      if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
        const primaryRecipient = isMultiShipping
          ? multiAddresses[expandedItems[0]?.key]
          : {
              firstName: recipientFirstName,
              lastName: recipientLastName,
              address: address,
              state: state,
              postcode: selectedPostcode,
              phone: recipientPhone,
            };
        const primaryRecipientName = `${primaryRecipient?.firstName ?? ''} ${primaryRecipient?.lastName ?? ''}`.trim();
        const primaryRecipientSuburb = getSuburbFromPostcode(primaryRecipient?.postcode);
        const primaryDeliveryDate = isMultiShipping
          ? multiDeliveryDates[expandedItems[0]?.key]
          : deliveryDate;
        const emailItems = isMultiToAddress
          ? cartItems.flatMap((item) =>
              Array.from({ length: item.quantity }, (_, index) => {
                const splitKey = getSplitItemKey(item, index);
                const splitShipment = splitShipments[splitKey];
                return {
                  name: item.name,
                  quantity: 1,
                  price: getDisplayPrice(item),
                  imageUrl: getImageUrl(item),
                  selectedOptions: buildSelectedOptions(item),
                  selectedSize: item.selectedSize,
                  recipientInfo: buildRecipientInfoFromSplit(splitShipment, itemMessages[splitKey]),
                };
              })
            )
          : cartItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: getDisplayPrice(item),
              imageUrl: getImageUrl(item),
              selectedOptions: buildSelectedOptions(item),
              selectedSize: item.selectedSize,
              recipientInfo: buildRecipientInfoFromMain(),
            }));

        const emailHtml = renderToStaticMarkup(
          <NewOrderEmail
            orderId={displayOrderId}
            items={emailItems}
            subtotal={subtotal}
            shipping={shippingCost}
            tax={totalGST}
            total={finalTotal}
            customerName={`${firstName} ${lastName}`.trim()}
            customerEmail={email}
            customerPhone={phone}
            deliveryDate={primaryDeliveryDate}
            recipientName={primaryRecipientName || undefined}
            recipientAddress={primaryRecipient?.address}
            recipientSuburb={primaryRecipientSuburb}
            recipientState={primaryRecipient?.state}
            recipientPostcode={primaryRecipient?.postcode}
            recipientPhone={primaryRecipient?.phone}
          />
        );

        const orderIdStr = String(displayOrderId);
        console.log('📧 Sending email to:', email);
        console.log('Payload:', {
          to_email: email,
          to_name: `${orderData.firstName ?? ''} ${orderData.lastName ?? ''}`.trim() || 'Customer',
          order_id: orderIdStr,
          email_subject: `Order Confirmed #${orderIdStr}!`,
        });

        if (email) {
          // Use order_id and email_subject from same display ID. In EmailJS template, set
          // Subject to {{email_subject}} so subject and body show the same order #.
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_name: `${orderData.firstName ?? ''} ${orderData.lastName ?? ''}`.trim() || 'Customer',
              to_email: email,
              order_id: orderIdStr,
              email_subject: `Order Confirmed #${orderIdStr}!`,
              content_html: emailHtml,
            },
            EMAILJS_PUBLIC_KEY
          );
          logSecurityEvent('Order confirmation email sent', { email });
        } else {
          console.error('❌ Critical: No email address found in formData, skipping email send.');
        }
      } else {
        console.warn('EmailJS config missing; skipping OrderReceipt email.');
      }

      clearCart();
      navigate('/success');
    } catch (error) {
      console.error('Error placing order:', error);
      alert(`Order placement failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center py-32">
            <ShoppingBag size={120} className="text-gray-300 mb-6" />
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-4">
              Your cart is empty.
            </h2>
            <Link
              to="/shop"
              className="px-8 py-3 bg-stone-900 text-white rounded font-semibold uppercase tracking-wide hover:bg-stone-800 transition-colors"
            >
              Return to Shop
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-6 lg:space-y-0 lg:flex lg:gap-8 lg:items-start">
          <OrderInfoPreview
            className="block lg:hidden"
            cartItems={cartItems}
            subtotal={subtotal}
            isMultiToAddress={isMultiToAddress}
            totalQuantity={totalQuantity}
            isMultiShipping={isMultiShipping}
            currentShippingFee={currentShippingFee}
            seasonalSurcharge={seasonalSurcharge}
            getDisplayPrice={getDisplayPrice}
            getImageUrl={getImageUrl}
          />
          <div className="w-full lg:w-2/3 space-y-5 font-sans">
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold text-stone-900">Customer Information</h2>
              </div>
              <div className="px-6 pb-6 pt-5 space-y-5">
                  {/* Autofill trap fields (hidden) */}
                  <div style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
                    <input type="text" name="fake_full_name" autoComplete="name" />
                    <input type="email" name="fake_email" autoComplete="email" />
                    <input type="tel" name="fake_phone" autoComplete="tel" />
                    <input type="text" name="fake_address" autoComplete="address-line1" />
                    <input type="text" name="fake_city" autoComplete="address-level2" />
                    <input type="text" name="fake_state" autoComplete="address-level1" />
                    <input type="text" name="fake_postcode" autoComplete="postal-code" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFormError('email');
                        if (errors.email) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.email;
                            return newErrors;
                          });
                        }
                      }}
                      required
                      className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                        errors.email || formErrors.email
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-stone-900'
                      }`}
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500 font-sans">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                            First Name
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value);
                              clearFormError('firstName');
                              if (errors.firstName) {
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.firstName;
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                              errors.firstName || formErrors.firstName
                                ? 'border-red-500 focus:border-red-600'
                                : 'border-gray-200 focus:border-stone-900'
                            }`}
                            placeholder="John"
                          />
                          {errors.firstName && (
                            <p className="mt-1 text-sm text-red-500 font-sans">{errors.firstName}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            value={lastName}
                            onChange={(e) => {
                              setLastName(e.target.value);
                              clearFormError('lastName');
                              if (errors.lastName) {
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.lastName;
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                              errors.lastName || formErrors.lastName
                                ? 'border-red-500 focus:border-red-600'
                                : 'border-gray-200 focus:border-stone-900'
                            }`}
                            placeholder="Doe"
                          />
                          {errors.lastName && (
                            <p className="mt-1 text-sm text-red-500 font-sans">{errors.lastName}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            clearFormError('phone');
                            if (errors.phone) {
                              setErrors((prev) => {
                                const newErrors = { ...prev };
                                delete newErrors.phone;
                                return newErrors;
                              });
                            }
                          }}
                          className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                            errors.phone || formErrors.phone
                              ? 'border-red-500 focus:border-red-600'
                              : 'border-gray-200 focus:border-stone-900'
                          }`}
                          placeholder="+61 400 000 000"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-500 font-sans">{errors.phone}</p>
                        )}
                      </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold text-stone-900">Delivery Options</h2>
              </div>
              <div className="px-6 pb-6 pt-5 space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-stone-900 mb-2">Shipping Method</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShippingMethod('delivery')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all font-sans ${
                          shippingMethod === 'delivery'
                            ? 'bg-stone-900 text-white'
                            : 'bg-white text-stone-900 border-2 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Truck size={20} />
                        Local Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setShippingMethod('pickup')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all font-sans ${
                          shippingMethod === 'pickup'
                            ? 'bg-stone-900 text-white'
                            : 'bg-white text-stone-900 border-2 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Store size={20} />
                        Store Pickup
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="deliveryDate" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                      {shippingMethod === 'delivery' ? 'Delivery Date' : 'Pickup Date'}
                    </label>
                    <input
                      type="date"
                      id="deliveryDate"
                      value={deliveryDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        if (selectedDate && !isDateAvailable(selectedDate)) {
                          alert('This date is not available for delivery. Please select another date.');
                          return;
                        }
                        setDeliveryDate(selectedDate);
                        if (errors.deliveryDate) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.deliveryDate;
                            return newErrors;
                          });
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                        errors.deliveryDate
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-200 focus:border-stone-900'
                      }`}
                    />
                    {errors.deliveryDate && (
                      <p className="mt-1 text-sm text-red-500 font-sans">{errors.deliveryDate}</p>
                    )}
                    {deliveryDate && checkIsSeasonal(deliveryDate) && (
                      <p className="mt-2 text-sm text-amber-600 font-sans flex items-center gap-1">
                        <span className="font-semibold">⚠️ Seasonal Date:</span>
                        <span>An additional $5 surcharge applies to this date.</span>
                      </p>
                    )}
                    {deliveryDate && checkIsClosed(deliveryDate) && (
                      <p className="mt-2 text-sm text-red-600 font-sans">
                        This date is not available for delivery.
                      </p>
                    )}
                  </div>

                  {shippingMethod === 'delivery' && (
                    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isMultiToAddress}
                          onChange={(e) => setIsMultiToAddress(e.target.checked)}
                          className="mt-1 w-5 h-5 text-stone-900 border-gray-300 rounded focus:ring-stone-900 focus:ring-2 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="block text-sm font-semibold text-stone-900 font-sans">
                            Deliver to multiple addresses
                          </span>
                          <span className="block text-xs text-gray-600 font-sans mt-1">
                            Split items to different recipients
                          </span>
                        </div>
                      </label>
                    </div>
                  )}

                  {shippingMethod === 'delivery' && !isMultiToAddress && (
                    <>
                      <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isRecipientSameAsSender}
                            onChange={(e) => setIsRecipientSameAsSender(e.target.checked)}
                            className="mt-1 w-5 h-5 text-stone-900 border-gray-300 rounded focus:ring-stone-900 focus:ring-2 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-stone-900 font-sans">
                            I am the recipient (same as sender)
                          </span>
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="recipientFirstName" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                              Recipient First Name
                            </label>
                            <input
                              type="text"
                              id="recipientFirstName"
                              name="recipient_first_name_ignore"
                              autoComplete="off"
                              value={recipientFirstName}
                              onChange={(e) => {
                                setRecipientFirstName(e.target.value);
                                if (errors.recipientFirstName) {
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.recipientFirstName;
                                    return newErrors;
                                  });
                                }
                              }}
                              disabled={isRecipientSameAsSender}
                              className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                                errors.recipientFirstName
                                  ? 'border-red-500 focus:border-red-600'
                                  : 'border-gray-200 focus:border-stone-900'
                              }`}
                              placeholder="Jane"
                            />
                            {errors.recipientFirstName && (
                              <p className="mt-1 text-sm text-red-500 font-sans">{errors.recipientFirstName}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="recipientLastName" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                              Recipient Last Name
                            </label>
                            <input
                              type="text"
                              id="recipientLastName"
                              name="recipient_last_name_ignore"
                              autoComplete="off"
                              value={recipientLastName}
                              onChange={(e) => {
                                setRecipientLastName(e.target.value);
                                if (errors.recipientLastName) {
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.recipientLastName;
                                    return newErrors;
                                  });
                                }
                              }}
                              disabled={isRecipientSameAsSender}
                              className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                                errors.recipientLastName
                                  ? 'border-red-500 focus:border-red-600'
                                  : 'border-gray-200 focus:border-stone-900'
                              }`}
                              placeholder="Doe"
                            />
                            {errors.recipientLastName && (
                              <p className="mt-1 text-sm text-red-500 font-sans">{errors.recipientLastName}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="recipientPhone" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                            Recipient Phone
                          </label>
                          <input
                            type="tel"
                            id="recipientPhone"
                            name="recipient_phone_ignore"
                            autoComplete="off"
                            value={recipientPhone}
                            onChange={(e) => {
                              setRecipientPhone(e.target.value);
                              if (errors.recipientPhone) {
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.recipientPhone;
                                  return newErrors;
                                });
                              }
                            }}
                            disabled={isRecipientSameAsSender}
                            className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                              errors.recipientPhone
                                ? 'border-red-500 focus:border-red-600'
                                : 'border-gray-200 focus:border-stone-900'
                            }`}
                            placeholder="+61 400 000 000"
                          />
                          {errors.recipientPhone && (
                            <p className="mt-1 text-sm text-red-500 font-sans">{errors.recipientPhone}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label htmlFor="address" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                            Street Address
                          </label>
                          <input
                            type="text"
                            id="address"
                            name="checkout_address_ignore"
                            autoComplete="off"
                            value={address}
                            onChange={(e) => {
                              setAddress(e.target.value);
                            clearFormError('address');
                              if (errors.address) {
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.address;
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full p-3 border rounded focus:outline-none transition font-sans ${
                            errors.address || formErrors.address
                                ? 'border-red-500 focus:border-red-600'
                                : 'border-gray-200 focus:border-stone-900'
                            }`}
                            placeholder="123 Main Street"
                          />
                          {errors.address && (
                            <p className="mt-1 text-sm text-red-500 font-sans">{errors.address}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="state" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                              State
                            </label>
                            <select
                              id="state"
                              value={state}
                              onChange={(e) => {
                                setState(e.target.value);
                                clearFormError('state');
                                if (e.target.value === 'OTHER') {
                                  setSelectedPostcode('');
                                  setDeliveryZonePrice(null);
                                  clearFormError('postcode');
                                }
                                if (e.target.value !== 'VIC') {
                                  clearFormError('postcode');
                                }
                              }}
                              className={`w-full p-3 border rounded focus:border-stone-900 outline-none transition font-sans ${
                                errors.state || formErrors.state
                                  ? 'border-red-500 focus:border-red-600'
                                  : 'border-gray-200'
                              }`}
                            >
                              <option value="VIC">Victoria</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          {state === 'VIC' && (
                            <div>
                              <label htmlFor="postcode" className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                                Suburb / Postcode
                              </label>
                              <PostcodeCombobox
                                value={selectedPostcode}
                                onChange={(value) => {
                                  setSelectedPostcode(value);
                                  clearFormError('postcode');
                                  if (errors.postcode) {
                                    setErrors((prev) => {
                                      const newErrors = { ...prev };
                                      delete newErrors.postcode;
                                      return newErrors;
                                    });
                                  }
                                }}
                                onPriceChange={setDeliveryZonePrice}
                                inputName="shipping_estimate"
                                inputAutoComplete="new-password"
                                inputId="postcode"
                                hasError={Boolean(formErrors.postcode || errors.postcode)}
                                error={errors.postcode}
                                onErrorChange={(error) => {
                                  if (error === null && errors.postcode) {
                                    setErrors((prev) => {
                                      const newErrors = { ...prev };
                                      delete newErrors.postcode;
                                      return newErrors;
                                    });
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {state === 'OTHER' && (
                          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                            <h3 className="font-semibold text-amber-900 mb-3 font-sans flex items-center gap-2">
                              <Phone size={18} />
                              Delivery not available to your area
                            </h3>
                            <p className="text-sm text-amber-800 mb-3 font-sans">
                              Please contact us to arrange delivery to your location.
                            </p>
                            <div className="space-y-2 text-sm text-amber-900 font-sans">
                              <p><strong>Address:</strong> {SHOP_INFO.address}</p>
                              <p><strong>Email:</strong> <a href={`mailto:${SHOP_INFO.email}`} className="underline hover:text-amber-700">{SHOP_INFO.email}</a></p>
                              <p><strong>Phone:</strong> <a href={`tel:${SHOP_INFO.phone.replace(/\s/g, '')}`} className="underline hover:text-amber-700">{SHOP_INFO.phone}</a></p>
                            </div>
                            <a
                              href={`tel:${SHOP_INFO.phone.replace(/\s/g, '')}`}
                              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors font-sans"
                            >
                              <Phone size={18} />
                              Call Shop
                            </a>
                          </div>
                        )}

                        {state === 'VIC' && selectedPostcode === 'other' && (
                          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                            <h3 className="font-semibold text-amber-900 mb-3 font-sans flex items-center gap-2">
                              <Phone size={18} />
                              Delivery not available to your area
                            </h3>
                            <p className="text-sm text-amber-800 mb-3 font-sans">
                              Please contact us to arrange delivery to your location.
                            </p>
                            <div className="space-y-2 text-sm text-amber-900 font-sans">
                              <p><strong>Address:</strong> {SHOP_INFO.address}</p>
                              <p><strong>Email:</strong> <a href={`mailto:${SHOP_INFO.email}`} className="underline hover:text-amber-700">{SHOP_INFO.email}</a></p>
                              <p><strong>Phone:</strong> <a href={`tel:${SHOP_INFO.phone.replace(/\s/g, '')}`} className="underline hover:text-amber-700">{SHOP_INFO.phone}</a></p>
                            </div>
                            <a
                              href={`tel:${SHOP_INFO.phone.replace(/\s/g, '')}`}
                              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors font-sans"
                            >
                              <Phone size={18} />
                              Call Shop
                            </a>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {shippingMethod === 'delivery' && isMultiToAddress && (
                    <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-4">
                      <h3 className="text-sm font-semibold text-stone-900 font-sans">
                        Split Shipment Details
                      </h3>
                      {cartItems
                        .flatMap((item) =>
                          Array.from({ length: item.quantity }, (_, index) => ({
                            item,
                            index,
                          }))
                        )
                        .map(({ item, index }, itemIndex, expandedList) => {
                          const splitKey = getSplitItemKey(item, index);
                          const splitAddress = splitShipments[splitKey] || {
                          firstName: '',
                          lastName: '',
                          address: '',
                          state: 'VIC',
                          postcode: '',
                          phone: '',
                        };
                        return (
                          <div key={splitKey} className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-stone-900 font-sans">
                                {item.name} (Item {index + 1} of {item.quantity})
                              </p>
                              <p className="text-xs text-gray-500 font-sans">
                                Size: {item.selectedSize}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                                  Recipient First Name
                                </label>
                                <input
                                  type="text"
                                  value={splitAddress.firstName}
                                  onChange={(e) => updateSplitShipment(splitKey, 'firstName', e.target.value)}
                                  className="w-full p-2 text-sm border rounded focus:outline-none transition font-sans border-gray-200 focus:border-stone-900"
                                  placeholder="Jane"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                                  Recipient Last Name
                                </label>
                                <input
                                  type="text"
                                  value={splitAddress.lastName}
                                  onChange={(e) => updateSplitShipment(splitKey, 'lastName', e.target.value)}
                                  className="w-full p-2 text-sm border rounded focus:outline-none transition font-sans border-gray-200 focus:border-stone-900"
                                  placeholder="Doe"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                                Recipient Phone <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                value={splitAddress.phone}
                                onChange={(e) => updateSplitShipment(splitKey, 'phone', e.target.value)}
                                className="w-full p-2 text-sm border rounded focus:outline-none transition font-sans border-gray-200 focus:border-stone-900"
                                placeholder="+61 400 000 000"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                                Street Address
                              </label>
                              <input
                                type="text"
                                value={splitAddress.address}
                                onChange={(e) => updateSplitShipment(splitKey, 'address', e.target.value)}
                                className="w-full p-2 text-sm border rounded focus:outline-none transition font-sans border-gray-200 focus:border-stone-900"
                                placeholder="123 Main Street"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                                  State <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={splitAddress.state || 'VIC'}
                                  onChange={(e) => updateSplitShipment(splitKey, 'state', e.target.value)}
                                  className="w-full p-2 text-sm border border-gray-200 rounded focus:border-stone-900 outline-none transition font-sans"
                                >
                                  <option value="VIC">Victoria</option>
                                  <option value="OTHER">Other</option>
                                </select>
                              </div>
                              {splitAddress.state === 'VIC' && (
                                <div>
                                  <label className="block text-xs font-semibold text-stone-900 mb-1.5 font-sans">
                                    Suburb / Postcode <span className="text-red-500">*</span>
                                  </label>
                                  <PostcodeCombobox
                                    value={splitAddress.postcode || ''}
                                    onChange={(postcode) => updateSplitShipment(splitKey, 'postcode', postcode)}
                                    inputName={`shipping_estimate_split_${splitKey}`}
                                    inputAutoComplete="new-password"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="rounded-xl border border-stone-200 bg-[#FDFBF7] p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">🎁</span>
                                <p className="text-sm font-serif text-stone-700">
                                  Message for {item.name}
                                </p>
                              </div>
                              <textarea
                                value={itemMessages[splitKey] || ''}
                                onChange={(e) => updateItemMessage(splitKey, e.target.value)}
                                rows={3}
                                placeholder="Write a lovely message here..."
                                className="w-full bg-white/70 p-3 text-sm text-stone-700 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300 resize-none font-sans"
                              />
                            </div>
                            {itemIndex < expandedList.length - 1 && (
                              <hr className="my-6 border-gray-200" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isMultiToAddress && (
                    <div className="rounded-xl border border-stone-200 bg-[#FDFBF7] p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🎁</span>
                        <p className="text-base font-serif text-stone-700">
                          Gift Card Message
                        </p>
                      </div>
                      <textarea
                        value={globalMessage}
                        onChange={(e) => setGlobalMessage(e.target.value)}
                        rows={3}
                        placeholder="Write a lovely message here..."
                        className="w-full bg-white/70 p-3 text-sm text-stone-700 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300 resize-none font-sans"
                      />
                    </div>
                  )}

                </div>
            </div>

          </div>

        {/* Right Column: Order Summary */}
          <div className="w-full lg:w-1/3">
            <div className="space-y-6 h-fit lg:sticky lg:top-4">
              <OrderInfoPreview
                className="hidden lg:block"
                cartItems={cartItems}
                subtotal={subtotal}
                isMultiToAddress={isMultiToAddress}
                totalQuantity={totalQuantity}
                isMultiShipping={isMultiShipping}
                currentShippingFee={currentShippingFee}
                seasonalSurcharge={seasonalSurcharge}
                getDisplayPrice={getDisplayPrice}
                getImageUrl={getImageUrl}
              />
              <PaymentActions
                appliedCoupon={appliedCoupon}
                couponCode={couponCode}
                onCouponChange={setCouponCode}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                discountAmount={discountAmount}
                finalTotal={finalTotal}
                totalGST={totalGST}
                isFormValid={isFormValid}
                hasOtherState={hasOtherState}
                isPaymentLoading={isPaymentLoading}
                paymentError={paymentError}
                clientSecret={clientSecret}
                shouldRenderForm={shouldRenderForm}
                fetchClientSecret={fetchClientSecret}
                handlePaymentSuccess={handlePaymentSuccess}
                validateForm={validateForm}
                setFormErrors={setFormErrors}
                scrollToFirstError={scrollToFirstError}
                validateAllSteps={validateAllSteps}
                setErrors={setErrors}
              />
            </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
