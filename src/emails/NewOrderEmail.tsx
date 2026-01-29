import React from 'react';
import { Html, Head, Body, Container, Section, Text, Img } from '@react-email/components';
import { getDisplayOrderId } from '../lib/orderId';

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
  selectedSize?: string;
  recipientInfo?: RecipientInfo | null;
}

interface NewOrderEmailProps {
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

const extractSize = (item: EmailItem): string | null => {
  const size = item.selectedOptions?.Size ?? item.selectedSize;
  if (!size) return null;
  if (typeof size === 'string') return size;
  if (typeof size === 'object' && size?.label) return String(size.label);
  return String(size);
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
  const displayOrderId = getDisplayOrderId(orderId);
  return (
    <Html>
      <Head />
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#f3f4f6' }}>
        <Container style={{ maxWidth: '480px', margin: '16px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px' }}>
          <Section>
            <Text style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px' }}>
              New Order: #{displayOrderId}
            </Text>
          </Section>

          <Section>
            {items.map((item, index) => {
              const sizeText = extractSize(item);
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
                      {sizeText && (
                        <Text style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                          Size: {sizeText}
                        </Text>
                      )}
                      <Text style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                        Qty: {item.quantity} x {formatCurrency(item.price)}
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
