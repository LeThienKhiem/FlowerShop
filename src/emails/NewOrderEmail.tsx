import React from 'react';
import { Html, Head, Body, Container, Section, Text } from '@react-email/components';

interface RecipientInfo {
  name?: string;
  phone?: string;
  address?: string;
  suburb?: string;
  state?: string;
  message?: string;
}

const EXTRA_KEYS = ['Balloon', 'Bear', 'Chocolate', 'Vase', 'Wine'] as const;

interface EmailItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  selectedOptions?: Record<string, unknown> | null;
  selected_options?: Record<string, unknown> | null;
  selectedSize?: string;
  recipientInfo?: RecipientInfo | null;
  /** Per-item delivery date (from order_items.delivery_date) */
  deliveryDate?: string | null;
  /** Per-item card/gift message (from order_items.card_message) */
  cardMessage?: string | null;
  /** Explicit extra quantities (if provided by order_items) */
  balloon_qty?: number;
  bear_qty?: number;
  chocolate_qty?: number;
  vase_qty?: number;
  wine_qty?: number;
  /** Optional unit prices per extra when saved on order_items */
  balloon_price?: number;
  bear_price?: number;
  chocolate_price?: number;
  vase_price?: number;
  wine_price?: number;
}

interface NewOrderEmailProps {
  orderId: string | number;
  items: EmailItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  discountAmount?: number;
  discountCode?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryDate?: string;
  recipientName?: string;
  recipientAddress?: string;
  recipientSuburb?: string;
  recipientState?: string;
  recipientPostcode?: string;
  recipientPhone?: string;
  /** Gift message (e.g. order.gift_message or global message) */
  giftMessage?: string | null;
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const formatDeliveryDate = (value?: string): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Long format for delivery details block: "Tuesday, 23 Dec 2025" */
const formatDeliveryDateLong = (value?: string | null): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getOptions = (item: EmailItem): Record<string, unknown> => {
  const raw = item.selected_options ?? item.selectedOptions;
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, unknown>;
};

/** Parse quantity from option value (e.g. "5 Balloons" -> 5, or { qty: 3 } -> 3). */
const parseQtyFromOption = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'object' && value !== null && 'qty' in value) {
    const q = (value as { qty?: number }).qty;
    return typeof q === 'number' && Number.isFinite(q) ? Math.max(0, q) : 0;
  }
  const s = String(value);
  const match = s.match(/^(\d+)/);
  return match ? Math.max(0, parseInt(match[1], 10)) : 0;
};

const getExtraQty = (item: EmailItem, key: string): number => {
  const byKey: Record<string, keyof EmailItem> = {
    Balloon: 'balloon_qty',
    Bear: 'bear_qty',
    Chocolate: 'chocolate_qty',
    Vase: 'vase_qty',
    Wine: 'wine_qty',
  };
  const prop = byKey[key];
  const itemRecord = item as unknown as Record<string, any>;
  if (prop && typeof itemRecord[prop] === 'number') {
    return Math.max(0, itemRecord[prop]);
  }
  const options = getOptions(item);
  return parseQtyFromOption(options[key]);
};

/** Default unit prices per extra when not in selected_options (e.g. Bear=$20, Vase=$25). */
const DEFAULT_EXTRA_PRICES: Record<string, number> = {
  Balloon: 10,
  Bear: 25,
  Chocolate: 20,
  Vase: 25,
  Wine: 30,
};

/** Parse unit price from option value (e.g. "Small Bear (+$24.99)" -> 24.99, or { price: 25 } -> 25). */
const parsePriceFromOption = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && value !== null && 'price' in value) {
    const p = (value as { price?: number }).price;
    return typeof p === 'number' && Number.isFinite(p) ? p : null;
  }
  const s = String(value);
  const match = s.match(/\(\+\$([\d.]+)\)/);
  return match ? parseFloat(match[1]) : null;
};

/** Get display label for an extra from option value (e.g. "Small Bear (+$24.99)" -> "Small Bear"). */
const getExtraLabel = (item: EmailItem, key: string): string => {
  const options = getOptions(item);
  const val = options[key];
  if (val === null || val === undefined) return key;
  if (typeof val === 'object' && val !== null && 'name' in val && typeof (val as { name: string }).name === 'string') {
    return (val as { name: string }).name;
  }
  const s = String(val);
  const withoutPrice = s.replace(/\s*\(\+\$[\d.]+\)\)?$/, '').trim();
  return withoutPrice || key;
};

/** Get unit price for an extra (from item.bear_price etc., or selected_options, or default). */
const getExtraUnitPrice = (item: EmailItem, key: string): number => {
  const priceProp = (key.charAt(0).toLowerCase() + key.slice(1)) + '_price' as keyof EmailItem;
  const itemRecord = item as unknown as Record<string, any>;
  if (typeof itemRecord[priceProp as string] === 'number') {
    return itemRecord[priceProp as string];
  }
  const options = getOptions(item);
  const parsed = parsePriceFromOption(options[key]);
  if (parsed !== null && parsed >= 0) return parsed;
  return DEFAULT_EXTRA_PRICES[key] ?? 0;
};

/** Build table rows for one item: one main row + one row per extra (all 5 extras, qty 0 shown as 0 / $0.00). */
type TableRow =
  | { type: 'main'; productLabel: string; quantity: number; price: number; deliveryDate?: string | null }
  | { type: 'extra'; label: string; quantity: number; unitPrice: number };

const getItemRows = (item: EmailItem): TableRow[] => {
  const rows: TableRow[] = [];
  const totalLine = item.price * item.quantity;

  let totalExtraCost = 0;
  const extraRows: { qty: number; unitPrice: number; label: string }[] = [];
  for (const key of EXTRA_KEYS) {
    const qty = getExtraQty(item, key);
    const unitPrice = qty > 0 ? getExtraUnitPrice(item, key) : 0;
    totalExtraCost += qty * unitPrice;
    const label = qty > 0 ? getExtraLabel(item, key) : key;
    extraRows.push({ qty, unitPrice, label });
  }

  const flowerOnlyTotal = totalLine - totalExtraCost;
  const flowerOnlyUnit = item.quantity > 0 ? Math.round((flowerOnlyTotal / item.quantity) * 100) / 100 : 0;

  rows.push({
    type: 'main',
    productLabel: `${item.name}${item.selectedSize ? ` - ${item.selectedSize}` : ''}`,
    quantity: item.quantity,
    price: flowerOnlyUnit,
    deliveryDate: item.deliveryDate ?? undefined,
  });
  for (const { label, qty, unitPrice } of extraRows) {
    rows.push({ type: 'extra', label: `Add on: ${label}`, quantity: qty, unitPrice });
  }
  return rows;
};

const tableStyle = {
  width: '100%' as const,
  borderCollapse: 'collapse' as const,
  marginTop: '8px',
  marginBottom: '8px',
};
const thStyle = {
  padding: '10px 12px',
  textAlign: 'left' as const,
  backgroundColor: '#1c1917',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '14px',
  borderBottom: '2px solid #1c1917',
};
const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
  color: '#374151',
};
const tdRight = { ...tdStyle, textAlign: 'right' as const };

const NewOrderEmail: React.FC<NewOrderEmailProps> = ({
  orderId,
  items,
  subtotal,
  shipping,
  total,
  discountAmount,
  discountCode,
  customerName,
  customerEmail,
  customerPhone,
  deliveryDate,
  recipientName,
  recipientAddress,
  recipientSuburb,
  recipientState,
  recipientPostcode,
  recipientPhone,
  giftMessage,
}) => {
  const normalizedDiscount = Math.max(0, Number(discountAmount ?? 0));
  const shouldShowCoupon = normalizedDiscount > 0;
  const gstAmount = total / 11;
  const recipientLocality = [recipientSuburb, recipientState].filter(Boolean).join(', ');
  const recipientCityLine = [recipientLocality, recipientPostcode].filter(Boolean).join(' ');
  const isSingleItem = items.length === 1;

  return (
    <Html>
      <Head />
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#f3f4f6' }}>
        <Container style={{ maxWidth: '560px', margin: '16px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px' }}>
          {/* 1. Title */}
          <Section>
            <Text style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#111827' }}>
              Order Confirmation #{orderId}
            </Text>
          </Section>

          {/* 2. Product Table: [Product] | [Quantity] | [Price] */}
          <Section>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Quantity</th>
                  <th style={{ ...thStyle, width: '100px', textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {items.flatMap((item, itemIndex) => {
                  const rowEls = getItemRows(item).map((row, rowIndex) => {
                    const key = `item-${itemIndex}-row-${rowIndex}`;
                    if (row.type === 'main') {
                      return (
                        <tr key={key}>
                          <td style={tdStyle}>
                            <Text style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>
                              {row.productLabel}
                            </Text>
                            {row.deliveryDate && (
                              <Text style={{ fontSize: '12px', margin: '4px 0 0', color: '#6b7280' }}>
                                Delivery Date: {formatDeliveryDate(row.deliveryDate)}
                              </Text>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{row.quantity}</td>
                          <td style={tdRight}>{formatCurrency(row.price)}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={key}>
                        <td style={tdStyle}>
                          <Text style={{ fontSize: '13px', margin: 0, color: '#6b7280' }}>
                            {row.label}
                          </Text>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{row.quantity}</td>
                        <td style={tdRight}>{formatCurrency(row.unitPrice)}</td>
                      </tr>
                    );
                  });
                  if (!isSingleItem) {
                    const displayName = item.recipientInfo?.name ?? recipientName ?? 'N/A';
                    const displayAddress = item.recipientInfo
                      ? [item.recipientInfo.address, item.recipientInfo.suburb, item.recipientInfo.state].filter(Boolean).join(', ') || 'N/A'
                      : [recipientAddress, recipientCityLine].filter(Boolean).join(', ') || 'N/A';
                    const displayMessage = (item.cardMessage ?? giftMessage ?? '').trim();
                    const displayDate = item.deliveryDate ?? deliveryDate ?? '';
                    rowEls.push(
                      <tr key={`item-${itemIndex}-delivery`}>
                        <td colSpan={3} style={{ ...tdStyle, backgroundColor: '#f9fafb', padding: '12px 12px', fontSize: '13px' }}>
                          <Text style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: '0 0 6px', textTransform: 'uppercase' }}>
                            Delivery Details
                          </Text>
                          <Text style={{ margin: '2px 0', color: '#374151' }}>
                            <strong>Delivery Date:</strong> {formatDeliveryDateLong(displayDate)}
                          </Text>
                          <Text style={{ margin: '2px 0', color: '#374151' }}>
                            <strong>To:</strong> {displayName}
                          </Text>
                          <Text style={{ margin: '2px 0', color: '#374151' }}>
                            <strong>Addr:</strong> {displayAddress}
                          </Text>
                          {displayMessage ? (
                            <Text style={{ margin: '2px 0', color: '#374151' }}>
                              <strong>Message:</strong> &ldquo;{displayMessage}&rdquo;
                            </Text>
                          ) : null}
                        </td>
                      </tr>
                    );
                  }
                  return rowEls;
                })}
              </tbody>
            </table>
          </Section>

          {/* 3. Info Section: Billing always; Message + Recipient only for single-item (classic footer) */}
          <Section style={{ marginTop: '20px' }}>
            {isSingleItem && giftMessage && giftMessage.trim() && (
              <Section style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>Message</Text>
                <Text style={{ fontSize: '14px', margin: 0, color: '#374151' }}>{giftMessage.trim()}</Text>
              </Section>
            )}
            <Section style={{ marginBottom: '16px' }}>
              <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>Billing</Text>
              <Text style={{ fontSize: '14px', margin: '2px 0', color: '#374151' }}>{customerName || 'N/A'}</Text>
              <Text style={{ fontSize: '14px', margin: '2px 0', color: '#374151' }}>{customerPhone || 'N/A'}</Text>
              <Text style={{ fontSize: '14px', margin: '2px 0', color: '#374151' }}>{customerEmail || 'N/A'}</Text>
            </Section>
            {isSingleItem && (
              <Section>
                <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>Recipient</Text>
                <Text style={{ fontSize: '14px', margin: '2px 0', color: '#374151' }}>{recipientName || 'N/A'}</Text>
                <Text style={{ fontSize: '14px', margin: '2px 0', color: '#374151' }}>
                  {[recipientAddress, recipientCityLine].filter(Boolean).join(', ') || 'N/A'}
                </Text>
                <Text style={{ fontSize: '14px', margin: '2px 0', color: '#374151' }}>Phone: {recipientPhone || 'N/A'}</Text>
              </Section>
            )}
          </Section>

          {/* 4. Cost Section */}
          <Section style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <table style={{ ...tableStyle, maxWidth: '320px', marginLeft: 'auto' }}>
              <tbody>
                <tr>
                  <td style={tdStyle}>Subtotal</td>
                  <td style={tdRight}>{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Shipping</td>
                  <td style={tdRight}>{formatCurrency(shipping)}</td>
                </tr>
                {shouldShowCoupon && (
                  <tr>
                    <td style={tdStyle}>Coupon{discountCode ? ` (${discountCode})` : ''}</td>
                    <td style={tdRight}>-{formatCurrency(normalizedDiscount)}</td>
                  </tr>
                )}
                <tr>
                  <td style={tdStyle}>GST (includes)</td>
                  <td style={tdRight}>{formatCurrency(gstAmount)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700, fontSize: '16px', color: '#111827' }}>Total</td>
                  <td style={{ ...tdRight, fontWeight: 700, fontSize: '16px', color: '#111827' }}>{formatCurrency(total)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* 5. Footer (exact text) */}
          <Section style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <Text style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px', textAlign: 'center' }}>
              Thank you for placing an order with us
            </Text>
            <Text style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px', textAlign: 'center' }}>
              Magnolia Florist Blackburn Pty Ltd | ABN: 41 64 42 61 816
            </Text>
            <Text style={{ fontSize: '12px', color: '#666666', margin: 0, textAlign: 'center' }}>
              *For the purposes of Australian taxation, this receipt serves as a Tax Invoice
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NewOrderEmail;
