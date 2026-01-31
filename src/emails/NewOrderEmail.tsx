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
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const EXCLUDED_OPTION_KEYS = new Set(['sku', 'id', 'product_id']);

const getSelectedOptions = (item: EmailItem): Record<string, any> => {
  const raw = item.selected_options ?? item.selectedOptions;
  if (!raw || typeof raw !== 'object') return {};
  return raw;
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
  customerName,
  customerEmail,
  customerPhone,
}) => {
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
              Subtotal: {formatCurrency(subtotal)}
            </Text>
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
            <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Billing Customer</Text>
            <Text style={{ fontSize: '12px', margin: '4px 0 0' }}>{customerName || 'N/A'}</Text>
            <Text style={{ fontSize: '12px', margin: '4px 0 0' }}>{customerEmail || 'N/A'}</Text>
            <Text style={{ fontSize: '12px', margin: '4px 0 0' }}>{customerPhone || 'N/A'}</Text>
          </Section>

          <Section style={{ marginTop: '16px' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0, textAlign: 'center' }}>
              Thank you for your order. We are preparing it now.
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
