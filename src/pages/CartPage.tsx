import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Pencil, Truck, Store, Phone } from 'lucide-react';
import Header from '../components/Header';
import { useCart, CartItem } from '../context/CartContext';
import EditCartModal from '../components/EditCartModal';
import PostcodeCombobox, { DeliveryZone } from '../components/ui/PostcodeCombobox';
import { useShopDates } from '../hooks/useShopDates';

// Shop information
const SHOP_INFO = {
  address: "127 Canterbury Rd, Blackburn South VIC 3130",
  phone: "03 9877 3164",
  email: "magnoliaflowers.au@gmail.com",
};


// Data type for suburb entries
interface SuburbEntry {
  name: string;
  postcode: string;
  state: string;
  lat?: number;
  lon?: number;
}


function getTodayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateFriendly(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { month: 'long', day: 'numeric' });
}

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, updateCartItem } = useCart();
  const { dateConfig } = useShopDates();
  const navigate = useNavigate();
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const todayStr = useMemo(() => getTodayYYYYMMDD(), []);
  const isShopClosedToday = dateConfig.closed.includes(todayStr);
  const todayFormatted = useMemo(() => formatDateFriendly(todayStr), [todayStr]);
  
  // Shipping state
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbEntry | null>(null);
  
  // Shipping estimate state
  const [selectedPostcode, setSelectedPostcode] = useState<string>('');
  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<DeliveryZone | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  

  // Helper function to get image URL
  const getImageUrl = (item: typeof cartItems[0]): string => {
    if (item.images && item.images.length > 0) {
      return item.images[0];
    }
    return 'https://via.placeholder.com/400x400?text=No+Image';
  };

  // Helper function to get display price
  const getDisplayPrice = (item: typeof cartItems[0]): number => {
    return item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
  };

  // Calculate item total
  const getItemTotal = (item: typeof cartItems[0]): number => {
    return getDisplayPrice(item) * item.quantity;
  };

  // Calculate GST for an item
  const getItemGST = (item: typeof cartItems[0]): number => {
    const itemTotal = getItemTotal(item);
    return itemTotal / 11;
  };

  // Calculate cart totals
  const subtotal = cartItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  
  // Calculate shipping cost (0 for pickup, null/0 for "Other", or zone price for delivery)
  const calculatedShipping = shippingMethod === 'pickup' 
    ? 0 
    : (shippingCost ?? 0);
  
  const grandTotal = subtotal + calculatedShipping;
  const totalGST = grandTotal / 11;


  // Empty state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center py-32">
            <ShoppingBag size={120} className="text-gray-300 mb-6" />
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-4">
              Your cart is currently empty.
            </h2>
            <Link
              to="/shop"
              className="px-8 py-3 bg-stone-900 text-white rounded font-semibold uppercase tracking-wide hover:bg-stone-800 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {editingItem && (
        <EditCartModal
          isOpen={editingItem !== null}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          onSave={(newSize, newQuantity, newMessage, newPrice, newSelectedOptions) => {
            updateCartItem(
              editingItem.id,
              editingItem.selectedSize,
              newSize,
              newQuantity,
              newMessage,
              newPrice,
              newSelectedOptions
            );
          }}
        />
      )}
      <main className="container mx-auto px-4 py-12">
        {/* Heading */}
        <h1 className="text-4xl font-serif font-bold text-center mb-12 text-stone-900">
          Your Shopping Cart
        </h1>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const displayPrice = getDisplayPrice(item);
              const itemTotal = getItemTotal(item);
              const itemGST = getItemGST(item);
              
              return (
                <div
                  key={`${item.id}-${item.selectedSize}`}
                  className="flex gap-6 py-6 border-b border-gray-100"
                >
                  {/* Image */}
                  <img
                    src={getImageUrl(item)}
                    alt={item.name}
                    className="w-24 h-32 object-cover rounded-md bg-gray-100 flex-shrink-0"
                  />

                  {/* Info - Mobile: stacked, Desktop: flex row with price on right */}
                  <div className="flex-1 flex flex-col md:flex-row md:justify-between">
                    {/* Left Section: Product Info & Actions */}
                    <div className="flex-1 flex flex-col">
                      {/* Product Info */}
                      <div>
                        <h3 className="text-xl font-serif font-medium text-stone-900 mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2 font-sans">
                          Size: {item.selectedSize}
                        </p>
                        {/* Price - Mobile: below size, Desktop: hidden (shown on right) */}
                        <p className="font-medium text-stone-900 font-sans mb-1 md:hidden">
                          ${displayPrice.toFixed(2)}
                        </p>
                        {/* GST - Mobile: below price */}
                        <p className="text-xs text-gray-500 font-sans mb-2 md:hidden">
                          GST: ${itemGST.toFixed(2)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {/* Quantity Control */}
                        <div className="flex items-center border-2 border-stone-200 rounded w-fit group focus-within:border-stone-900 transition-colors">
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedSize, -1)}
                            className="px-3 py-1.5 text-lg text-gray-500 hover:text-stone-900 hover:bg-gray-100 transition font-sans"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            readOnly
                            className="w-12 text-center border-none focus:ring-0 font-bold font-sans text-sm"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedSize, 1)}
                            className="px-3 py-1.5 text-lg text-gray-500 hover:text-stone-900 hover:bg-gray-100 transition font-sans"
                          >
                            +
                          </button>
                        </div>

                        {/* Edit & Remove Buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="flex items-center gap-1 text-stone-500 hover:text-stone-900 transition-colors font-sans"
                          >
                            <Pencil size={18} />
                            <span className="text-sm">Edit</span>
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id, item.selectedSize)}
                            className="flex items-center gap-2 text-red-400 hover:text-red-600 transition-colors font-sans"
                          >
                            <Trash2 size={18} />
                            <span className="text-sm">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Price & Total - Desktop */}
                    <div className="text-right md:ml-auto md:flex md:flex-col md:justify-between">
                      {/* Unit Price - Desktop only */}
                      <p className="font-medium text-stone-900 font-sans hidden md:block mb-1">
                        ${displayPrice.toFixed(2)}
                      </p>
                      {/* GST - Desktop only */}
                      <p className="text-xs text-gray-500 font-sans hidden md:block mb-2">
                        GST: ${itemGST.toFixed(2)}
                      </p>
                      {/* Item Total */}
                      <p className="font-semibold text-stone-900 font-sans">
                        ${itemTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-stone-50 p-8 rounded-lg h-fit sticky top-24">
              <h2 className="text-2xl font-serif font-bold mb-6 text-stone-900">
                Order Summary
              </h2>

              {/* Shipping Method Toggle - Moved to top of Order Summary */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-stone-900 mb-3 font-sans">
                  Delivery Method
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShippingMethod('delivery');
                      setSelectedSuburb(null);
                      setSelectedPostcode(''); // Reset postcode when switching
                      setShippingCost(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold transition-all font-sans text-sm ${
                      shippingMethod === 'delivery'
                        ? 'bg-stone-900 text-white'
                        : 'bg-white text-stone-900 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Truck size={18} />
                    Local Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShippingMethod('pickup');
                      setSelectedState('');
                      setSelectedSuburb(null);
                      setSelectedPostcode('');
                      setShippingCost(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold transition-all font-sans text-sm ${
                      shippingMethod === 'pickup'
                        ? 'bg-stone-900 text-white'
                        : 'bg-white text-stone-900 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Store size={18} />
                    Store Pickup
                  </button>
                </div>
              </div>

              {/* Store Pickup Info - Show in Order Summary when pickup is selected */}
              {shippingMethod === 'pickup' && (
                <div className="mb-6 p-4 bg-stone-100 border-2 border-stone-200 rounded-lg">
                  <h3 className="font-semibold text-stone-900 mb-2 font-sans text-sm">Pickup Location</h3>
                  <p className="text-xs text-gray-600 font-sans">
                    127 Canterbury Rd<br />
                    Blackburn South, VIC 3130<br />
                    Phone: (03) 9877 3164
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-stone-200 my-4"></div>

              {/* Subtotal */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-600 font-sans">Subtotal</span>
                <span className="font-medium text-stone-900 font-sans">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              {/* Shipping Estimate Section */}
              {shippingMethod === 'delivery' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-stone-900 mb-2 font-sans">
                    Shipping Estimate
                  </label>
                  
                  {/* Searchable Combobox */}
                  <PostcodeCombobox
                    value={selectedPostcode}
                    onChange={(postcode) => {
                      setSelectedPostcode(postcode);
                    }}
                    onPriceChange={setShippingCost}
                    onZoneChange={setSelectedDeliveryZone}
                    preferredSuburb={selectedDeliveryZone?.suburb}
                  />
                  
                  {/* Show contact info when "Other" is selected */}
                  {selectedPostcode === 'other' && (
                    <div className="mt-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
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
              )}

              {/* Divider */}
              <div className="border-t border-stone-200 my-4"></div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold text-stone-900 font-sans">
                  Total
                </span>
                <span className="text-xl font-bold text-stone-900 font-sans">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-sans text-right mb-6">
                (Includes GST: ${totalGST.toFixed(2)})
              </p>

              {/* Closed today: show message and hide checkout */}
              {isShopClosedToday ? (
                <div className="mt-6 p-5 rounded-lg border-2 border-amber-200 bg-amber-50 text-center">
                  <p className="text-amber-900 font-sans text-sm leading-relaxed">
                    Due to high demand on Valentine&apos;s Day, online orders are temporarily closed on {todayFormatted}. Call us at (03) 9877 3164 to check availability. Shop walk-in is welcome.
                  </p>
                  <a
                    href="tel:0398773164"
                    className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors font-sans text-sm"
                  >
                    <Phone size={18} />
                    Call (03) 9877 3164
                  </a>
                </div>
              ) : (
                /* Checkout Button */
                <button
                  onClick={() => {
                    if (shippingMethod === 'delivery') {
                      if (!selectedPostcode || selectedPostcode === 'other') {
                        alert('Please select a valid delivery postcode. For areas not listed, please contact us.');
                        return;
                      }
                    }
                    navigate('/checkout', {
                      state: {
                        deliveryMethod: shippingMethod,
                        shippingAddress: {
                          state: selectedState,
                          suburb: selectedDeliveryZone?.suburb || selectedSuburb?.name || '',
                          postcode: selectedPostcode || selectedSuburb?.postcode || ''
                        }
                      }
                    });
                  }}
                  disabled={shippingMethod === 'delivery' && (!selectedPostcode || selectedPostcode === 'other')}
                  className={`w-full py-4 rounded font-bold uppercase tracking-widest transition-all mt-6 text-center font-sans ${
                    shippingMethod === 'delivery' && (!selectedPostcode || selectedPostcode === 'other')
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {shippingMethod === 'delivery' && (!selectedPostcode || selectedPostcode === 'other')
                    ? 'Please Select Postcode'
                    : 'Proceed to Checkout'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CartPage;
