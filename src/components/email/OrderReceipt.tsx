import React from 'react';
import { CartItem } from '../../context/CartContext';
import { OrderData } from '../../lib/email';

interface RecipientInfo {
  name?: string;
  phone?: string;
  address?: string;
  suburb?: string;
  message?: string;
}

interface OrderReceiptItem extends CartItem {
  recipientInfo?: RecipientInfo;
}

interface OrderReceiptProps {
  order: OrderData;
  items: OrderReceiptItem[];
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

const parseSelectedOptions = (item: CartItem): Record<string, any> => {
  const raw = (item as any).selectedOptions ?? (item as any).selected_options;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, any>;
  }
  return {};
};

const renderOptionValue = (value: any): string => {
  if (Array.isArray(value)) {
    return value.map(renderOptionValue).filter(Boolean).join(', ');
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
  if (value === null || value === undefined) return '';
  return String(value);
};

const OrderReceipt: React.FC<OrderReceiptProps> = ({ order, items }) => {
  const headerStyle: React.CSSProperties = {
    backgroundColor: '#D87BB0',
    color: '#ffffff',
    padding: '16px 20px',
    fontSize: '20px',
    fontWeight: 700,
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    borderBottom: '1px solid #e5e5e5',
    padding: '10px 8px',
    fontSize: '14px',
    color: '#333333',
  };

  const tdStyle: React.CSSProperties = {
    borderBottom: '1px solid #f0f0f0',
    padding: '10px 8px',
    fontSize: '14px',
    color: '#333333',
    verticalAlign: 'top',
  };

  const optionTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666666',
    margin: '4px 0 0',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '16px 20px',
    fontFamily: 'Arial, sans-serif',
    color: '#333333',
  };

  const totalRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '14px',
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', padding: '24px 0' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #eee' }}>
        <div style={headerStyle}>New Order: #{order.id}</div>
        <div style={sectionStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const options = parseSelectedOptions(item);
              return (
                <tr key={`${item.id}-${item.selectedSize}-${index}`}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    {Object.entries(options).map(([key, value]) => {
                      const displayValue = renderOptionValue(value);
                      if (!displayValue) return null;
                      return (
                        <div key={key} style={optionTextStyle}>
                          {key}: {displayValue}
                        </div>
                      );
                    })}
                    {item.recipientInfo && (
                      <div
                        style={{
                          marginTop: '8px',
                          backgroundColor: '#fdf2f8',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '12px',
                          color: '#7a4a63',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>📍 Delivering to:</div>
                        <div>
                          {item.recipientInfo.name || 'N/A'}
                          {item.recipientInfo.phone ? ` | ${item.recipientInfo.phone}` : ''}
                        </div>
                        <div>
                          {[item.recipientInfo.address, item.recipientInfo.suburb].filter(Boolean).join(', ') || 'N/A'}
                        </div>
                        {item.recipientInfo.message && (
                          <div style={{ marginTop: '2px' }}>
                            Message: {item.recipientInfo.message}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{item.quantity}</td>
                  <td style={tdStyle}>{formatCurrency(item.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '16px' }}>
          <div style={totalRowStyle}>
            <span>Subtotal: </span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div style={totalRowStyle}>
            <span>Shipping: </span>
            <span>{formatCurrency(order.shipping)}</span>
          </div>
          <div style={totalRowStyle}>
            <span>GST: </span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          <div style={{ ...totalRowStyle, fontWeight: 700 }}>
            <span>Total: </span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            Billing Customer
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            <div>{`${order.firstName ?? ''} ${order.lastName ?? ''}`.trim() || 'N/A'}</div>
            <div>{order.email || 'N/A'}</div>
            <div>{order.phone || 'N/A'}</div>
          </div>
        </div>

        <div style={{ marginTop: '16px', fontSize: '13px', color: '#666666' }}>
          Thank you for your order. We are preparing it now.
        </div>
        <div
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#666666',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          * For the purpose of Australian taxation, this receipt serves as a Tax invoice.
        </div>
        </div>
      </div>
    </div>
  );
};

export default OrderReceipt;
