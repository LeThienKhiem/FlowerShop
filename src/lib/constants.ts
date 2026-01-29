import { PartyPopper, Cat, Candy, GlassWater, Wine } from 'lucide-react';
import React from 'react';

// Size options with tiered pricing
export const SIZE_OPTIONS = [
  { name: 'Regular', label: 'Regular', extraPrice: 0 },
  { name: 'Premium', label: 'Premium', extraPrice: 30 },
  { name: 'Platinum', label: 'Platinum', extraPrice: 52.50 }
] as const;

export type SizeName = typeof SIZE_OPTIONS[number]['name'];

// Icon mapping for extra categories (pass components, not rendered elements)
export const EXTRA_ICONS: { [key: string]: React.ComponentType<{ className?: string; strokeWidth?: number }> } = {
  balloon: PartyPopper,
  bear: Cat,
  chocolate: Candy,
  vase: GlassWater,
  wine: Wine,
};

// Extra options configuration
export const EXTRA_OPTIONS = {
  balloon: [
    { label: 'None', price: 0 },
    { label: 'Foil Balloon (+$9.99)', price: 9.99, name: 'Foil Balloon' },
    { label: 'Helium Balloon (+$14.99)', price: 14.99, name: 'Helium Balloon' }
  ],
  bear: [
    { label: 'None', price: 0 },
    { label: 'Small Bear (+$24.99)', price: 24.99, name: 'Small Bear' },
    { label: 'Medium Bear (+$39.99)', price: 39.99, name: 'Medium Bear' },
    { label: 'Large Bear (+$59.99)', price: 59.99, name: 'Large Bear' }
  ],
  chocolate: [
    { label: 'None', price: 0 },
    { label: 'Small Chocolate (+$15.95)', price: 15.95, name: 'Small Chocolate' },
    { label: 'Medium Chocolate (+$19.95)', price: 19.95, name: 'Medium Chocolate' },
    { label: 'Large Chocolate (+$24.95)', price: 24.95, name: 'Large Chocolate' }
  ],
  vase: [
    { label: 'None', price: 0 },
    { label: 'Small Vase (+$25.00)', price: 25.00, name: 'Small Vase' },
    { label: 'Medium Vase (+$35.00)', price: 35.00, name: 'Medium Vase' },
    { label: 'Large Vase (+$45.00)', price: 45.00, name: 'Large Vase' }
  ],
  wine: [
    { label: 'None', price: 0 },
    { label: 'Procesco Sparkling Wine (+$30.00)', price: 30.00, name: 'Procesco Sparkling Wine' },
    { label: 'Shiraz Red Wine (+$30.00)', price: 30.00, name: 'Shiraz Red Wine' },
    { label: 'Moet Champagne (+$85.00)', price: 85.00, name: 'Moet Champagne' }
  ]
} as const;
