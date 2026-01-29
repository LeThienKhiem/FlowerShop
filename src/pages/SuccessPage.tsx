import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Header from '../components/Header';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {/* Success Icon */}
          <CheckCircle 
            size={64} 
            className="text-green-600 mb-6" 
            strokeWidth={2}
          />
          
          {/* Title */}
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4 mt-4">
            Order Confirmed!
          </h1>
          
          {/* Message */}
          <p className="text-gray-600 text-center max-w-md mb-8 font-sans">
            Thank you for your purchase. We have received your order and sent a confirmation email.
          </p>
          
          {/* Continue Shopping Button */}
          <button
            onClick={() => navigate('/shop')}
            className="bg-stone-900 text-white px-8 py-3 rounded font-semibold uppercase tracking-wide hover:bg-stone-800 transition-colors font-sans"
          >
            Continue Shopping
          </button>
        </div>
      </main>
    </div>
  );
};

export default SuccessPage;
