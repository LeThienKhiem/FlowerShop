import React from 'react';

// Extra Option Selector Component
interface ExtraOptionSelectorProps {
  title: string;
  options: readonly { label: string; price: number; name?: string }[];
  selectedIdx: number;
  onSelect: (index: number) => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const ExtraOptionSelector: React.FC<ExtraOptionSelectorProps> = ({
  title,
  options,
  selectedIdx,
  onSelect,
  icon: Icon,
}) => {
  // Helper to determine if an option is the most expensive ("Premium")
  const isPremium = (idx: number) => idx > 0 && idx === options.length - 1;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3 font-sans">{title}</h3>
      
      {/* Container: 2-column grid on mobile, 4-column grid on desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const premiumOption = isPremium(idx);

          // Base styling for all cards
          let cardClasses = `relative cursor-pointer rounded-xl border p-4 text-center transition-all duration-200 group w-full h-full flex flex-col items-center justify-center min-h-[130px] md:min-h-[160px]`;
          
          // Conditional styling based on selection and tier
          if (isSelected) {
            if (premiumOption) {
              // Selected & Premium: Gold border, subtle gold bg, shadow
              cardClasses += ` border-[#C8A97E] bg-[#F9F5F0] shadow-sm`;
            } else {
              // Selected & Standard: Dark gray border, slight bg fill
              cardClasses += ` border-stone-800 bg-stone-50`;
            }
          } else {
            // Not selected: Default light gray border, hover effect
            cardClasses += ` border-gray-200 hover:border-stone-400 hover:bg-gray-50`;
          }

          return (
            <div
              key={idx}
              onClick={() => onSelect(idx)}
              className={cardClasses}
            >
              {/* Premium Badge for the most expensive option */}
              {premiumOption && (
                <div className={`absolute top-0 right-0 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-bl-md text-white ${isSelected ? 'bg-[#C8A97E]' : 'bg-gray-400/80 group-hover:bg-[#C8A97E]/80 transition-colors'}`}>
                  PREMIUM
                </div>
              )}

              {/* Icon with dynamic color based on selection/tier */}
              <Icon 
                className={`w-6 h-6 md:w-8 md:h-8 mb-2 md:mb-3 transition-colors ${
                  isSelected 
                    ? (premiumOption ? 'text-[#C8A97E]' : 'text-stone-900') 
                    : 'text-gray-300 group-hover:text-gray-400'
                }`} 
                strokeWidth={1.5} 
              />
              
              {/* Option Label - ensure legible text size on mobile */}
              <h4 className={`text-xs md:text-sm font-medium mb-1 font-sans leading-tight ${isSelected ? 'text-stone-900' : 'text-gray-600'}`}>
                {option.label.split('(')[0].trim()}
              </h4>
              
              {/* Price indicator */}
              {option.price > 0 && (
                <p className={`text-xs font-semibold font-sans ${isSelected ? (premiumOption ? 'text-[#C8A97E]' : 'text-stone-900') : 'text-gray-500'}`}>
                  +${option.price.toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExtraOptionSelector;
