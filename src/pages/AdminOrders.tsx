import React, { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDisplayOrderId } from '../lib/orderId';

interface OrderItem {
  id?: number | string;
  order_id?: number | string;
  product_name?: string;
  quantity?: number;
  price?: number;
  image_url?: string;
  size?: string;
  selected_options?: Record<string, any> | null;
  options?: Record<string, any> | null;
  variants?: Record<string, any> | null;
  metadata?: Record<string, any> | string | null;
  recipient_info?: {
    name?: string;
    address?: string;
    suburb?: string;
    state?: string;
    phone?: string;
    message?: string;
  } | null;
  product?: {
    name?: string;
    images?: string[] | null;
    image_url?: string | null;
  } | null;
}

interface Order {
  id: number | string;
  created_at?: string;
  createdAt?: string;
  total_amount?: number;
  totalAmount?: number;
  total?: number;
  status?: string;
  customer_details?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    address?: string;
    state?: string;
    postcode?: string;
    city?: string;
    sender?: Record<string, any> | null;
    recipient?: Record<string, any> | null;
    addresses?: Array<{
      itemId?: number | string;
      itemName?: string;
      quantity?: number;
      size?: string;
      address?: any;
    }>;
    [key: string]: any;
  } | null;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  order_items?: OrderItem[];
  recipient_details?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    address?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    message?: string;
    [key: string]: any;
  } | null;
  // Allow any additional fields from database
  [key: string]: any;
}

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Set<number | string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch orders from Supabase
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(*))')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load orders';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Update order status
  const handleStatusChange = async (orderId: number | string, newStatus: string) => {
    try {
      setUpdatingStatus((prev) => new Set(prev).add(orderId));

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      // Show success message
      alert(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdatingStatus((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Format date to readable format (e.g., "Jan 13, 2026, 10:30 AM")
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      console.error('Error formatting date:', dateString, e);
      return 'Invalid Date';
    }
  };

  // Format currency
  const formatCurrency = (amount: number | undefined | null): string => {
    const value = amount || 0;
    return `$${value.toFixed(2)}`;
  };

  // Get customer name from order (handles both snake_case and camelCase)
  const getCustomerName = (order: Order): string => {
    // Try customer_details JSONB field first
    if (order.customer_details) {
      if (order.customer_details.name) {
        return order.customer_details.name;
      }
      if (order.customer_details.firstName && order.customer_details.lastName) {
        return `${order.customer_details.firstName} ${order.customer_details.lastName}`;
      }
    }
    // Try snake_case columns
    if (order.first_name && order.last_name) {
      return `${order.first_name} ${order.last_name}`;
    }
    // Try camelCase columns
    if (order.firstName && order.lastName) {
      return `${order.firstName} ${order.lastName}`;
    }
    // Fallback to email or N/A
    if (order.email) {
      return order.email;
    }
    return 'N/A';
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string | undefined): React.ReactElement => {
    const statusValue = status || 'Pending';
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(statusValue)}`}>
        {statusValue}
      </span>
    );
  };

  // Handle view details
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  // Get customer info for modal
  const getCustomerInfo = (order: Order) => {
    const details = order.customer_details || {};
    const sender = details.sender || {};
    return {
      name: sender.firstName && sender.lastName
        ? `${sender.firstName} ${sender.lastName}`
        : getCustomerName(order),
      email: order.email || details.email || 'N/A',
      phone: sender.phone || details.phone || 'N/A',
    };
  };

  const getRecipientInfo = (order: Order) => {
    const recipient = order.recipient_details || order.customer_details?.recipient || {};
    const address = order.recipient_details?.address || order.customer_details?.address || '';
    const state = order.recipient_details?.state || order.customer_details?.state || '';
    const postcode = order.recipient_details?.postcode || order.customer_details?.postcode || '';
    const addressLine = [address, state, postcode].filter(Boolean).join(', ');

    return {
      name: recipient.firstName && recipient.lastName
        ? `${recipient.firstName} ${recipient.lastName}`
        : 'N/A',
      phone: recipient.phone || 'N/A',
      address: addressLine || 'N/A',
      message: order.recipient_details?.message || '',
    };
  };

  // Get items from order (prefer order_items, fallback to customer_details.addresses)
  const getOrderItems = (order: Order) => {
    if (order.order_items && Array.isArray(order.order_items)) {
      return order.order_items.map((item) => ({
        name: item.product?.name || item.product_name || 'Unknown Item',
        quantity: item.quantity || 1,
        price: item.price || 0,
        imageUrl: item.product?.images?.[0] || item.product?.image_url || item.image_url || '',
        options: extractItemOptions(item),
        recipientInfo: item.recipient_info || null,
        cardMessage: (item as { card_message?: string | null }).card_message || '',
      }));
    }
    const details = order.customer_details || {};
    if (details.addresses && Array.isArray(details.addresses)) {
      return details.addresses.map((addr: any) => ({
        name: addr.itemName || 'Unknown Item',
        quantity: addr.quantity || 1,
        size: addr.size || 'N/A',
        options: extractItemOptions(addr),
        recipientInfo: null,
      }));
    }
    return null;
  };

  const extractItemOptions = (item: any): Array<{ label: string; value: string }> => {
    const rawOptions =
      item?.selected_options ??
      item?.options ??
      item?.variants ??
      item?.metadata ??
      item?.customizations ??
      null;

    let parsedOptions = rawOptions;
    if (typeof rawOptions === 'string') {
      try {
        parsedOptions = JSON.parse(rawOptions);
      } catch (e) {
        parsedOptions = rawOptions;
      }
    }

    if (parsedOptions && typeof parsedOptions === 'object' && !Array.isArray(parsedOptions)) {
      const optionEntries = Object.entries(parsedOptions)
        .filter(([_, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => ({
          label: formatOptionLabel(key),
          value: formatOptionValue(value),
        }))
        .filter(({ value }) => value !== '');

      if (optionEntries.length > 0) {
        return optionEntries;
      }
    }

    if (item?.size) {
      return [{ label: 'Size', value: String(item.size) }];
    }

    return [];
  };

  const formatOptionLabel = (key: string): string => {
    return key
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatOptionValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.map((entry) => formatOptionValue(entry)).filter(Boolean).join(', ');
    }
    if (value && typeof value === 'object') {
      if ('label' in value && typeof value.label === 'string') {
        return value.label;
      }
      if ('value' in value && typeof value.value === 'string') {
        return value.value;
      }
      return JSON.stringify(value);
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return '';
  };

  return (
    <div>
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-2">
              Order Management
            </h1>
            <p className="text-gray-600 font-sans">
              View and manage all customer orders
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6 font-sans">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600 font-sans">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600 font-sans">No orders found.</p>
            </div>
          ) : (
            /* Orders Table */
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider font-sans">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider font-sans">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider font-sans">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider font-sans">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider font-sans">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider font-sans">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-sans">
                          #{getDisplayOrderId(order.id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-sans">
                          {formatDate(order.created_at || order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-sans">
                          {getCustomerName(order)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 font-sans">
                          {formatCurrency(order.total_amount || order.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status || 'Pending'}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={updatingStatus.has(order.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border-2 cursor-pointer transition-colors ${getStatusBadgeColor(
                              order.status || 'Pending'
                            )} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-stone-500 disabled:opacity-50 disabled:cursor-not-allowed font-sans`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-sans">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(order)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            {updatingStatus.has(order.id) && (
                              <span className="text-gray-400 text-xs">Updating...</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg w-full max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-gray-900">
                Order Details #{getDisplayOrderId(selectedOrder.id)}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Buyer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-sans">Buyer Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 font-sans">
                  {(() => {
                    const customerInfo = getCustomerInfo(selectedOrder);
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium text-gray-900">{customerInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium text-gray-900">{customerInfo.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium text-gray-900">{customerInfo.phone}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Recipient Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-sans">Recipient Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 font-sans">
                  {(() => {
                    const hasSplitRecipients = Boolean(
                      selectedOrder.order_items?.some((item) => item.recipient_info)
                    );
                    if (hasSplitRecipients) {
                      return (
                        <p className="text-sm text-gray-600">
                          This order uses split shipment. See each item for recipient details.
                        </p>
                      );
                    }
                    const recipientInfo = getRecipientInfo(selectedOrder);
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium text-gray-900">{recipientInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium text-gray-900">{recipientInfo.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Address:</span>
                          <span className="font-medium text-gray-900 text-right">{recipientInfo.address}</span>
                        </div>
                        {recipientInfo.message && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Message:</span>
                            <span className="font-medium text-gray-900 text-right">{recipientInfo.message}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Items Purchased */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-sans">Items Purchased</h3>
                {(() => {
                  const items = getOrderItems(selectedOrder);
                  if (items && items.length > 0) {
                    return (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 font-sans">
                        {items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                            <div className="w-12 h-12 rounded bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">No image</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.name}</p>
                              {item.options?.length > 0 && (
                                <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                                  {item.options.map((option: { label: string; value: string }, optionIndex: number) => (
                                    <p key={`${option.label}-${optionIndex}`}>
                                      {option.label}: {option.value}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {item.recipientInfo && (
                                <div className="mt-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                  <span className="font-semibold">To:</span>{' '}
                                  {item.recipientInfo.name || 'N/A'}
                                  {' | '}
                                  {[
                                    item.recipientInfo.address,
                                    item.recipientInfo.suburb,
                                    item.recipientInfo.state,
                                  ]
                                    .filter(Boolean)
                                    .join(', ') || 'N/A'}
                                  {' | '}
                                  {item.recipientInfo.phone || 'N/A'}
                                </div>
                              )}
                              {item.cardMessage && (
                                <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-gray-800 border border-amber-100">
                                  <span className="font-semibold">Message:</span> {item.cardMessage}
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-gray-800 text-right whitespace-nowrap">
                              {item.quantity} x ${Number(item.price || 0).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className="bg-gray-50 rounded-lg p-4 text-center font-sans">
                      <p className="text-gray-600">No items found for this order.</p>
                    </div>
                  );
                })()}
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-sans">Order Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 font-sans">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedOrder.created_at || selectedOrder.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {renderStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-300">
                    <span className="text-gray-900">Total Amount:</span>
                    <span className="text-gray-900">{formatCurrency(selectedOrder.total_amount || selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 bg-stone-900 text-white rounded-md font-medium hover:bg-stone-800 transition-colors font-sans"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
