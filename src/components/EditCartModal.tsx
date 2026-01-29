import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { CartItem } from '../context/CartContext';
import { SIZE_OPTIONS, EXTRA_OPTIONS, EXTRA_ICONS, type SizeName } from '../lib/constants';
import ExtraOptionSelector from './ExtraOptionSelector';

interface EditCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem;
  onSave: (
    newSize: string,
    newQuantity: number,
    newMessage: string,
    newPrice: number,
    newSelectedOptions: Record<string, any>
  ) => void;
}

const EditCartModal: React.FC<EditCartModalProps> = ({ isOpen, onClose, item, onSave }) => {
  // Get current size, defaulting to 'Regular' if not found
  const getCurrentSize = (): SizeName => {
    const found = SIZE_OPTIONS.find(opt => opt.name === item.selectedSize);
    return found ? found.name : 'Regular';
  };

  // Extract only the user's card message (not the technical summary)
  const extractCardMessage = (msg: string | undefined | null): string => {
    if (!msg) return '';
    
    // Check if message contains the summary pattern (Size: ... | Extras: ...)
    const parts = msg.split('\n\n');
    
    // If there's a summary part (last part after \n\n), extract only the card message
    if (parts.length > 1) {
      const cardMessagePart = parts.slice(0, -1).join('\n\n');
      // Only return if it doesn't look like a summary
      if (!cardMessagePart.includes('Size:') && !cardMessagePart.includes('Extras:')) {
        return cardMessagePart;
      }
    }
    
    // If the entire message is a summary (contains "Size:"), return empty
    if (msg.includes('Size:') || msg.includes('Extras:')) {
      return '';
    }
    
    // Otherwise, return the message as-is (user's actual message)
    return msg;
  };

  const [size, setSize] = useState<SizeName>(getCurrentSize());
  const [quantity, setQuantity] = useState(item.quantity);
  const [message, setMessage] = useState(() => extractCardMessage(item.message));
  
  // Parse extras from message to initialize state
  const parseExtrasFromMessage = (msg: string): Record<string, number> => {
    const defaults: Record<string, number> = {
      balloon: 0,
      bear: 0,
      chocolate: 0,
      vase: 0,
      wine: 0
    };
    
    // Extract the summary part (after \n\n if card message exists)
    const parts = msg.split('\n\n');
    const summaryPart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    
    // Check if summary contains "Extras:"
    if (summaryPart.includes('Extras:')) {
      const extrasMatch = summaryPart.match(/Extras:\s*(.+)/);
      if (extrasMatch) {
        const extrasList = extrasMatch[1].split(',').map(e => e.trim());
        
        // Match extras to their categories and indices
        Object.entries(EXTRA_OPTIONS).forEach(([category, options]) => {
          const foundIndex = options.findIndex(opt => 
            'name' in opt && opt.name && extrasList.includes(opt.name)
          );
          if (foundIndex > 0) {
            defaults[category] = foundIndex;
          }
        });
      }
    }
    
    return defaults;
  };

  const [extras, setExtras] = useState<Record<string, number>>(() => 
    parseExtrasFromMessage(item.message)
  );

  const getSizeMultiplier = (sizeName: SizeName): number => {
    if (sizeName === 'Premium') return 0.3;
    if (sizeName === 'Platinum') return 0.7;
    return 0;
  };

  // Calculate base price by reversing current size premium and extras
  const basePrice = useMemo(() => {
    const sizeMultiplier = getSizeMultiplier(getCurrentSize());
    
    // Calculate current extras total (only if product supports extras)
    const currentExtrasTotal = item.has_extras 
      ? Object.entries(parseExtrasFromMessage(item.message || '')).reduce((total, [category, index]) => {
          const options = EXTRA_OPTIONS[category as keyof typeof EXTRA_OPTIONS];
          const selectedOption = options[index] || options[0];
          return total + (selectedOption.price || 0);
        }, 0)
      : 0;
    
    // Use sale_price if available and less than price, otherwise use price
    const currentPrice = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
    const base = (currentPrice - currentExtrasTotal) / (1 + sizeMultiplier);
    return Number.isFinite(base) ? Math.max(base, 0) : 0;
  }, [item]);

  const sizeOptions = useMemo(() => (
    SIZE_OPTIONS.map((option) => {
      if (option.name === 'Premium') {
        return { ...option, extraPrice: basePrice * 0.3 };
      }
      if (option.name === 'Platinum') {
        return { ...option, extraPrice: basePrice * 0.7 };
      }
      return option;
    })
  ), [basePrice]);

  // Calculate new price based on selected size and extras
  const newPrice = useMemo(() => {
    const selectedSizeOption = sizeOptions.find(opt => opt.name === size);
    const sizeExtraPrice = selectedSizeOption ? selectedSizeOption.extraPrice : 0;
    
    // Calculate new extras total (only if product supports extras)
    const extrasTotal = item.has_extras
      ? Object.entries(extras).reduce((total, [category, index]) => {
          const options = EXTRA_OPTIONS[category as keyof typeof EXTRA_OPTIONS];
          const selectedOption = options[index] || options[0];
          return total + (selectedOption.price || 0);
        }, 0)
      : 0;
    
    return basePrice + sizeExtraPrice + extrasTotal;
  }, [basePrice, size, extras, item.has_extras]);

  // Initialize state when item changes
  useEffect(() => {
    setSize(getCurrentSize());
    setQuantity(item.quantity);
    setMessage(extractCardMessage(item.message));
    setExtras(parseExtrasFromMessage(item.message || ''));
  }, [item]);

  // Handle save
  const handleSave = () => {
    // Build summary string
    let summary = `Size: ${size}`;
    
    // Only include extras if product supports them
    if (item.has_extras) {
      const selectedExtras: string[] = [];
      Object.entries(extras).forEach(([category, index]) => {
        const options = EXTRA_OPTIONS[category as keyof typeof EXTRA_OPTIONS];
        const selectedOption = options[index];
        if (selectedOption && selectedOption.price > 0 && 'name' in selectedOption && selectedOption.name) {
          selectedExtras.push(selectedOption.name);
        }
      });
      
      if (selectedExtras.length > 0) {
        summary += ` | Extras: ${selectedExtras.join(', ')}`;
      }
    }
    
    // Use the clean card message (already extracted)
    // Combine with summary
    const fullMessage = message.trim()
      ? `${message}\n\n${summary}`
      : summary;

    const selectedSizeOption = sizeOptions.find(opt => opt.name === size) || sizeOptions[0];
    const sizeLabel = selectedSizeOption.extraPrice > 0
      ? `${selectedSizeOption.label} (+$${selectedSizeOption.extraPrice.toFixed(2)})`
      : selectedSizeOption.label;

    const selectedOptions: Record<string, any> = {
      Size: sizeLabel,
    };

    if (item.has_extras) {
      Object.entries(extras).forEach(([category, index]) => {
        const options = EXTRA_OPTIONS[category as keyof typeof EXTRA_OPTIONS];
        const selectedOption = options[index];
        if (selectedOption && selectedOption.price > 0) {
          const label = category.charAt(0).toUpperCase() + category.slice(1);
          selectedOptions[label] = selectedOption.label;
        }
      });
    }

    if (message.trim()) {
      selectedOptions.Message = message.trim();
    }

    onSave(size, quantity, fullMessage, newPrice, selectedOptions);
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">
          Edit Item
        </h2>

        {/* Size Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-stone-900 uppercase tracking-wide mb-2 font-sans">
            Size
          </label>
          <div className="flex gap-4 mt-2">
            {sizeOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => setSize(option.name)}
                className={`px-6 py-3 border-2 rounded transition-all duration-300 font-medium font-sans ${
                  size === option.name
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'border-stone-200 text-stone-900 hover:border-stone-900 hover:bg-stone-50'
                }`}
              >
                {option.extraPrice > 0 
                  ? `${option.label} (+$${option.extraPrice.toFixed(2)})`
                  : option.label
                }
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-stone-900 uppercase tracking-wide mb-2 font-sans">
            Quantity
          </label>
          <div className="flex items-center border-2 border-stone-200 rounded w-fit mt-2 group focus-within:border-stone-900 transition-colors">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-4 py-2 text-xl text-gray-500 hover:text-stone-900 hover:bg-gray-100 transition font-sans"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center border-none focus:ring-0 font-bold font-sans"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-4 py-2 text-xl text-gray-500 hover:text-stone-900 hover:bg-gray-100 transition font-sans"
            >
              +
            </button>
          </div>
        </div>

        {/* Choose Extras Section (only if product supports extras) */}
        {item.has_extras && (
          <div className="mb-6">
            <h3 className="text-center text-sm font-serif font-semibold text-stone-900 uppercase tracking-wide mb-4">
              CHOOSE EXTRAS TO MAKE IT MORE SPECIAL
            </h3>
            <div className="space-y-4">
              {/* Balloon */}
              <ExtraOptionSelector
                title="Balloon"
                options={EXTRA_OPTIONS.balloon}
                selectedIdx={extras.balloon}
                onSelect={(index) => setExtras({ ...extras, balloon: index })}
                icon={EXTRA_ICONS.balloon}
              />

              {/* Bear */}
              <ExtraOptionSelector
                title="Bear"
                options={EXTRA_OPTIONS.bear}
                selectedIdx={extras.bear}
                onSelect={(index) => setExtras({ ...extras, bear: index })}
                icon={EXTRA_ICONS.bear}
              />

              {/* Chocolate */}
              <ExtraOptionSelector
                title="Chocolate"
                options={EXTRA_OPTIONS.chocolate}
                selectedIdx={extras.chocolate}
                onSelect={(index) => setExtras({ ...extras, chocolate: index })}
                icon={EXTRA_ICONS.chocolate}
              />

              {/* Vase */}
              <ExtraOptionSelector
                title="Vase"
                options={EXTRA_OPTIONS.vase}
                selectedIdx={extras.vase}
                onSelect={(index) => setExtras({ ...extras, vase: index })}
                icon={EXTRA_ICONS.vase}
              />

              {/* Wine */}
              <ExtraOptionSelector
                title="Wine"
                options={EXTRA_OPTIONS.wine}
                selectedIdx={extras.wine}
                onSelect={(index) => setExtras({ ...extras, wine: index })}
                icon={EXTRA_ICONS.wine}
              />
            </div>
            
            {/* Show updated price preview */}
            {(size !== item.selectedSize || JSON.stringify(extras) !== JSON.stringify(parseExtrasFromMessage(item.message || ''))) && (
              <p className="text-sm text-gray-600 mt-4 font-sans">
                New price: <span className="font-semibold">${newPrice.toFixed(2)}</span>
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded font-semibold hover:bg-gray-50 transition-colors font-sans"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-stone-900 text-white rounded font-semibold hover:bg-stone-800 transition-colors font-sans"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCartModal;
