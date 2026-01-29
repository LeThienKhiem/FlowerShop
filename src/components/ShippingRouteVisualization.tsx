import React from 'react';

interface ShippingRouteVisualizationProps {
  destination: string; // Format: "Suburb Name State, Postcode"
}

const ShippingRouteVisualization: React.FC<ShippingRouteVisualizationProps> = ({ destination }) => {
  // Extract just the suburb name (format: "Suburb Name State, Postcode")
  // Split by comma to remove postcode, then by space to remove state code
  const suburbNameParts = destination.split(',')[0].trim().split(' ');
  suburbNameParts.pop(); // Remove the state code (last part)
  const suburbName = suburbNameParts.join(' ') || destination;
  const originState = 'VIC';
  const shippingFee = 15; // Placeholder shipping fee

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between relative">
        {/* Origin */}
        <div className="flex items-center gap-2 z-10 bg-gray-50 px-2">
          <div className="w-10 h-10 rounded-full bg-[#6B8E23] flex items-center justify-center text-white font-bold text-sm">
            {originState}
          </div>
        </div>

        {/* Animated Route Line */}
        <div className="flex-1 relative mx-4 h-0.5">
          {/* Dashed Line */}
          <div className="absolute inset-0 border-t-2 border-dashed border-gray-400"></div>
          
          {/* Animated Plane */}
          <div className="absolute top-1/2 transform -translate-y-1/2 rotate-90 animate-fly-across">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#6B8E23]"
            >
              <path
                d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-3 z-10 bg-gray-50 px-2">
          <span className="text-sm font-medium text-gray-700 font-sans whitespace-nowrap">
            {suburbName}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#6B8E23] text-white font-sans">
            Est: ${shippingFee}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShippingRouteVisualization;

