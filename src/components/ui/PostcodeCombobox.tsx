import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

// Delivery zones with postcodes and prices
export interface DeliveryZone {
  postcode: string;
  price: number;
  label: string;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  { postcode: "3130", price: 10, label: "3130 - Blackburn South" },
  { postcode: "3129", price: 20, label: "3129 - Box Hill North" },
  { postcode: "3131", price: 10, label: "3131 - Forest Hill" },
  { postcode: "3104", price: 20, label: "3104 - Balwyn North" },
  { postcode: "3103", price: 20, label: "3103 - Balwyn" },
  { postcode: "3125", price: 15, label: "3125 - Burwood" },
  { postcode: "3128", price: 15, label: "3128 - Box Hill" },
  { postcode: "3151", price: 15, label: "3151 - Burwood East" },
  { postcode: "3109", price: 20, label: "3109 - Doncaster East" },
  { postcode: "3108", price: 20, label: "3108 - Doncaster" },
  { postcode: "3132", price: 15, label: "3132 - Mitcham" },
  { postcode: "3133", price: 15, label: "3133 - Vermont" },
  { postcode: "3105", price: 20, label: "3105 - Bulleen" },
  { postcode: "3124", price: 20, label: "3124 - Camberwell" },
  { postcode: "3126", price: 20, label: "3126 - Canterbury" },
  { postcode: "3148", price: 20, label: "3148 - Chadstone" },
  { postcode: "3111", price: 20, label: "3111 - Donvale" },
  { postcode: "3122", price: 20, label: "3122 - Hawthorn" },
  { postcode: "3149", price: 20, label: "3149 - Mount Waverley" },
  { postcode: "3127", price: 20, label: "3127 - Surrey Hills" },
  { postcode: "3107", price: 20, label: "3107 - Templestowe" },
  { postcode: "3106", price: 20, label: "3106 - Templestowe Lower" },
  { postcode: "3121", price: 20, label: "3121 - Richmond / Burnley" },
  { postcode: "3169", price: 20, label: "3169 - Clarinda" },
  { postcode: "3142", price: 20, label: "3142 - Toorak / Hawksburn" },
  { postcode: "3131", price: 15, label: "3131 - Nunawading" },
  { postcode: "3134", price: 20, label: "3134 - Ringwood" },
  { postcode: "3135", price: 20, label: "3135 - Heathmont" },
  { postcode: "3130", price: 10, label: "3130 - Blackburn" },
  { postcode: "3130", price: 10, label: "3130 - Blackburn North" },
  { postcode: "3133", price: 15, label: "3133 - Vermont South" },
].sort((a, b) => a.postcode.localeCompare(b.postcode)); // Sort by postcode

// Helper function to get display label without price
const getDisplayLabel = (zone: DeliveryZone): string => {
  // Extract suburb name from label (format: "POSTCODE - Suburb Name")
  const match = zone.label.match(/^\d+\s*-\s*(.+)/);
  return match ? `${zone.postcode} - ${match[1]}` : zone.label;
};

interface PostcodeComboboxProps {
  value: string;
  onChange: (postcode: string) => void;
  onPriceChange?: (price: number | null) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  error?: string;
  onErrorChange?: (error: string | null) => void;
  inputName?: string;
  inputAutoComplete?: string;
  inputId?: string;
}

const PostcodeCombobox: React.FC<PostcodeComboboxProps> = ({
  value,
  onChange,
  onPriceChange,
  placeholder = "Search by postcode or suburb...",
  className = "",
  hasError = false,
  error,
  onErrorChange,
  inputName = "shipping_estimate",
  inputAutoComplete = "off",
  inputId,
}) => {
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || value === 'other') {
      setSelectedZone(null);
      return;
    }
    if (selectedZone?.postcode !== value) {
      const zone = DELIVERY_ZONES.find((z) => z.postcode === value) || null;
      setSelectedZone(zone);
    }
  }, [value, selectedZone?.postcode]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    };

    if (isComboboxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isComboboxOpen]);

  // Filter zones based on search input
  const filteredZones = useMemo(() => {
    if (!searchInput.trim()) {
      return DELIVERY_ZONES;
    }

    const searchLower = searchInput.toLowerCase().trim();
    return DELIVERY_ZONES.filter((zone) => {
      const postcodeMatch = zone.postcode.toLowerCase().includes(searchLower);
      const labelMatch = zone.label.toLowerCase().includes(searchLower);
      return postcodeMatch || labelMatch;
    });
  }, [searchInput]);

  // Check if search matches any zone
  const hasMatch = filteredZones.length > 0;

  // Handle zone selection
  const handleZoneSelect = (zone: DeliveryZone | 'other') => {
    if (zone === 'other') {
      onChange('other');
      onPriceChange?.(null);
      setSelectedZone(null);
    } else {
      onChange(zone.postcode);
      onPriceChange?.(zone.price);
      setSelectedZone(zone);
    }
    setSearchInput('');
    setIsComboboxOpen(false);
    if (onErrorChange && error) {
      onErrorChange(null);
    }
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    onPriceChange?.(null);
    setSearchInput('');
    setIsComboboxOpen(false);
    if (onErrorChange && error) {
      onErrorChange(null);
    }
  };

  // Get display value for input
  const getDisplayValue = (): string => {
    if (value === 'other') {
      return 'Other / Not Listed';
    }
    if (value) {
      if (selectedZone?.postcode === value) {
        return getDisplayLabel(selectedZone);
      }
      const zone = DELIVERY_ZONES.find((z) => z.postcode === value);
      return zone ? getDisplayLabel(zone) : '';
    }
    return '';
  };

  return (
    <div className="w-full">
      <div ref={comboboxRef} className={`relative ${className}`}>
        <div className="relative">
          <input
            type="text"
            id={inputId}
            value={isComboboxOpen ? searchInput : getDisplayValue()}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setIsComboboxOpen(true);
              if (onErrorChange && error) {
                onErrorChange(null);
              }
            }}
            onFocus={() => {
              setIsComboboxOpen(true);
              if (value) {
                setSearchInput('');
              }
            }}
            placeholder={placeholder}
            autoComplete={inputAutoComplete}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            name={inputName}
            spellCheck={false}
            className={`w-full p-3 pr-10 border rounded focus:outline-none transition font-sans bg-white ${
              error || hasError
                ? 'border-red-500 focus:border-red-600'
                : 'border-gray-200 focus:border-stone-900'
            }`}
          />
          {/* Clear Button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear selection"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Dropdown List */}
        {isComboboxOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {searchInput.trim() && !hasMatch ? (
              // Show "Other" option when no match
              <button
                type="button"
                onClick={() => handleZoneSelect('other')}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors font-sans text-sm"
              >
                Other / Not Listed
              </button>
            ) : (
              <>
                {/* Show all zones when no search or when there are matches */}
                {filteredZones.map((zone) => (
                  <button
                    key={`${zone.postcode}-${zone.label}`}
                    type="button"
                    onClick={() => handleZoneSelect(zone)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors font-sans text-sm ${
                      selectedZone?.postcode === zone.postcode && selectedZone?.label === zone.label
                        ? 'bg-stone-50 font-semibold'
                        : ''
                    }`}
                  >
                    {getDisplayLabel(zone)}
                  </button>
                ))}

                {/* Always show "Other" option at the end */}
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleZoneSelect('other')}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors font-sans text-sm ${
                      value === 'other' ? 'bg-stone-50 font-semibold' : ''
                    }`}
                  >
                    Other / Not Listed
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500 font-sans">{error}</p>
      )}
    </div>
  );
};

export default PostcodeCombobox;
