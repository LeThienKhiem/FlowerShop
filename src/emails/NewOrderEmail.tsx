import React from 'react';
import { Html, Head, Body, Container, Section, Text, Img } from '@react-email/components';

interface RecipientInfo {
  name?: string;
  phone?: string;
  address?: string;
  suburb?: string;
  message?: string;
}

interface EmailItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  selectedOptions?: Record<string, any> | null;
  selected_options?: Record<string, any> | null;
  selectedSize?: string;
  recipientInfo?: RecipientInfo | null;
}

interface NewOrderEmailProps {
  /** Display order ID (e.g. from getDisplayOrderId). Use same value for subject and body. */
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

const EXCLUDED_OPTION_KEYS = new Set(['sku', 'id', 'product_id']);
const EXTRA_PACKAGE_KEYS = ['Balloon', 'Bear', 'Chocolate', 'Vase', 'Wine'];

const getSelectedOptions = (item: EmailItem): Record<string, any> => {
  const raw = item.selected_options ?? item.selectedOptions;
  if (!raw || typeof raw !== 'object') return {};
  return raw;
};

const getExtraPackageLabel = (options: Record<string, any>): string => {
  const extras = EXTRA_PACKAGE_KEYS.map((key) => {
    if (!(key in options)) return null;
    return formatOptionValue((options as Record<string, any>)[key]);
  }).filter(Boolean) as string[];
  return extras.length > 0 ? extras.join(', ') : 'None';
};

const formatOptionValue = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    if ('name' in value && typeof value.name === 'string') {
      const price = Number((value as any).price ?? 0);
      const priceText = price > 0 ? ` (+${formatCurrency(price)})` : '';
      return `${value.name}${priceText}`;
    }
    if ('label' in value && typeof value.label === 'string') {
      return value.label;
    }
    return JSON.stringify(value);
  }
  return String(value);
};

const getImageUrl = (item: EmailItem): string => {
  return item.imageUrl || 'https://via.placeholder.com/64x64?text=No+Image';
};

const NewOrderEmail: React.FC<NewOrderEmailProps> = ({
  orderId,
  items,
  subtotal,
  shipping,
  tax,
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
}) => {
  const recipientLocality = [recipientSuburb, recipientState].filter(Boolean).join(', ');
  const recipientCityLine = [recipientLocality, recipientPostcode].filter(Boolean).join(' ');
  const normalizedDiscount = Math.max(0, Number(discountAmount ?? 0));
  const shouldShowDiscount = normalizedDiscount > 0;
  const discountLabel = discountCode ? `Coupon: ${discountCode}` : 'Discount';

  return (
    <Html>
      <Head />
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#f3f4f6' }}>
        <Container style={{ maxWidth: '480px', margin: '16px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px' }}>
          <Section>
            <Text style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px' }}>
              New Order: #{orderId}
            </Text>
          </Section>

          <Section>
            {items.map((item, index) => {
              const options = getSelectedOptions(item);
              const optionEntries = Object.entries(options).filter(
                ([key]) => !EXCLUDED_OPTION_KEYS.has(key)
              );
              const rowTotal = item.quantity * item.price;
              const extraPackageLabel = getExtraPackageLabel(options);
              return (
                <Section key={`${item.name}-${index}`} style={{ marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
                  <Section style={{ display: 'flex', gap: '12px' }}>
                    <Img
                      src={getImageUrl(item)}
                      width="64"
                      height="64"
                      alt={item.name}
                      style={{ borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <Section>
                      <Text style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{item.name}</Text>
                      {optionEntries.length > 0 && (
                        <Section style={{ marginTop: '6px' }}>
                          {optionEntries.map(([key, value]) => {
                            const displayValue = formatOptionValue(value);
                            if (!displayValue) return null;
                            return (
                              <Text key={key} style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                                • {key}: {displayValue}
                              </Text>
                            );
                          })}
                        </Section>
                      )}
                      <Text style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>
                        Qty: {item.quantity} x {formatCurrency(item.price)}
                      </Text>
                      <Text style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                        Extra Package: {extraPackageLabel}
                      </Text>
                      <Text style={{ fontSize: '13px', fontWeight: 600, margin: '4px 0 0' }}>
                        {formatCurrency(rowTotal)}
                      </Text>
                    </Section>
                  </Section>

                  {item.recipientInfo && (
                    <Section style={{ backgroundColor: '#fdf2f8', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                      <Text style={{ fontSize: '12px', margin: 0, fontWeight: 600 }}>
                        📍 Deliver To: {item.recipientInfo.name || 'N/A'}
                      </Text>
                      {item.recipientInfo.phone && (
                        <Text style={{ fontSize: '12px', margin: '6px 0 0' }}>📞 {item.recipientInfo.phone}</Text>
                      )}
                      <Text style={{ fontSize: '12px', margin: '6px 0 0' }}>
                        🏠 {[item.recipientInfo.address, item.recipientInfo.suburb].filter(Boolean).join(', ') || 'N/A'}
                      </Text>
                      {item.recipientInfo.message && (
                        <Text style={{ fontSize: '12px', margin: '6px 0 0' }}>
                          💬 Message: "{item.recipientInfo.message}"
                        </Text>
                      )}
                    </Section>
                  )}
                </Section>
              );
            })}
          </Section>

          <Section>
            <Text style={{ fontSize: '14px', margin: '0 0 6px' }}>
              Delivery Date: {formatDeliveryDate(deliveryDate)}
            </Text>
            <Text style={{ fontSize: '14px', margin: '0 0 6px' }}>
              Subtotal: {formatCurrency(subtotal)}
            </Text>
            {shouldShowDiscount && (
              <Text style={{ fontSize: '14px', margin: '0 0 6px' }}>
                {discountLabel}: -{formatCurrency(normalizedDiscount)}
              </Text>
            )}
            <Text style={{ fontSize: '14px', margin: '0 0 6px' }}>
              Shipping: {formatCurrency(shipping)}
            </Text>
            <Text style={{ fontSize: '14px', margin: '0 0 6px' }}>
              GST: {formatCurrency(tax)}
            </Text>
            <Text style={{ fontSize: '16px', fontWeight: 700, margin: '8px 0 0' }}>
              Total: {formatCurrency(total)}
            </Text>
          </Section>

          <Section style={{ marginTop: '16px' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Shipping Address</Text>
            <Text style={{ fontSize: '12px', margin: '4px 0 0', lineHeight: '1.5' }}>
              {recipientName || 'N/A'}
              <br />
              {recipientAddress || 'N/A'}
              <br />
              {recipientCityLine || 'N/A'}
              <br />
              Phone: {recipientPhone || 'N/A'}
            </Text>
          </Section>

          <Section style={{ marginTop: '16px' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Billing Customer</Text>
            <Text style={{ fontSize: '12px', margin: '4px 0 0' }}>{customerName || 'N/A'}</Text>
            <Text style={{ fontSize: '12px', margin: '4px 0 0' }}>{customerEmail || 'N/A'}</Text>
            <Text style={{ fontSize: '12px', margin: '4px 0 0' }}>{customerPhone || 'N/A'}</Text>
          </Section>

          <Section style={{ marginTop: '16px' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0, textAlign: 'center' }}>
              Thank you for placing an order with us.
            </Text>
            <Text style={{ fontSize: '12px', color: '#8898aa', margin: '6px 0 0', textAlign: 'center' }}>
              Magnolia Flowers | ABN 41 644 261 816
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: '#6b7280',
                fontStyle: 'italic',
                margin: '10px 0 0',
                textAlign: 'center',
              }}
            >
              * For the purpose of Australian taxation, this receipt serves as a Tax invoice.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NewOrderEmail;
