import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

// Delivery zones with postcodes and prices
export interface DeliveryZone {
  postcode: string;
  price: number;
  suburb: string;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  { suburb: "Blackburn South", postcode: "3130", price: 10 },
  { suburb: "Box Hill North", postcode: "3129", price: 20 },
  { suburb: "Forest Hill", postcode: "3131", price: 10 },
  { suburb: "Balwyn North", postcode: "3104", price: 20 },
  { suburb: "Balwyn", postcode: "3103", price: 20 },
  { suburb: "Burwood", postcode: "3125", price: 15 },
  { suburb: "Box Hill", postcode: "3128", price: 15 },
  { suburb: "Burwood East", postcode: "3151", price: 15 },
  { suburb: "Doncaster East", postcode: "3109", price: 20 },
  { suburb: "Doncaster", postcode: "3108", price: 20 },
  { suburb: "Mitcham", postcode: "3132", price: 15 },
  { suburb: "Vermont", postcode: "3133", price: 15 },
  { suburb: "Camberwell", postcode: "3124", price: 20 },
  { suburb: "Canterbury", postcode: "3126", price: 20 },
  { suburb: "Donvale", postcode: "3111", price: 20 },
  { suburb: "Mount Waverley", postcode: "3149", price: 20 },
  { suburb: "Surrey Hills", postcode: "3127", price: 20 },
  { suburb: "Templestowe", postcode: "3107", price: 20 },
  { suburb: "Templestowe Lower", postcode: "3106", price: 20 },
  { suburb: "Nunawading", postcode: "3131", price: 15 },
  { suburb: "Ringwood", postcode: "3134", price: 20 },
  { suburb: "Heathmont", postcode: "3135", price: 20 },
  { suburb: "Blackburn", postcode: "3130", price: 10 },
  { suburb: "Blackburn North", postcode: "3130", price: 10 },
  { suburb: "Vermont South", postcode: "3133", price: 15 },
].sort((a, b) => a.postcode.localeCompare(b.postcode) || a.suburb.localeCompare(b.suburb)); // Sort by postcode then suburb

export const normalizeSuburbName = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

// Helper function to get display label without price
const getDisplayLabel = (zone: DeliveryZone): string => `${zone.postcode} - ${zone.suburb}`;

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
  preferredSuburb?: string;
  onZoneChange?: (zone: DeliveryZone | null) => void;
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
  preferredSuburb,
  onZoneChange,
}) => {
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || value === 'other') {
      setSelectedZone(null);
      onZoneChange?.(null);
      return;
    }
    if (selectedZone?.postcode !== value) {
      const normalizedPreferredSuburb = preferredSuburb
        ? normalizeSuburbName(preferredSuburb)
        : '';
      const zone = normalizedPreferredSuburb
        ? DELIVERY_ZONES.find(
            (z) =>
              z.postcode === value &&
              normalizeSuburbName(z.suburb) === normalizedPreferredSuburb
          ) || DELIVERY_ZONES.find((z) => z.postcode === value) || null
        : DELIVERY_ZONES.find((z) => z.postcode === value) || null;
      setSelectedZone(zone);
      onZoneChange?.(zone);
    }
  }, [value, selectedZone?.postcode, preferredSuburb, onZoneChange]);

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
      const suburbMatch = zone.suburb.toLowerCase().includes(searchLower);
      return postcodeMatch || suburbMatch;
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
      onZoneChange?.(null);
    } else {
      onChange(zone.postcode);
      onPriceChange?.(zone.price);
      setSelectedZone(zone);
      onZoneChange?.(zone);
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
    setSelectedZone(null);
    onZoneChange?.(null);
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
      const zone = selectedZone || DELIVERY_ZONES.find((z) => z.postcode === value);
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
                    key={`${zone.postcode}-${zone.suburb}`}
                    type="button"
                    onClick={() => handleZoneSelect(zone)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors font-sans text-sm ${
                      selectedZone?.postcode === zone.postcode &&
                      selectedZone?.suburb === zone.suburb
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
