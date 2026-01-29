import React, { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface StripePaymentFormProps {
  amount: number;
  clientSecret: string;
  onSuccess: () => void;
  onValidate?: () => boolean;
  isProcessing?: boolean;
}

type StripePaymentInnerProps = Omit<StripePaymentFormProps, 'clientSecret'>;

console.log('Stripe Key loaded:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const StripePaymentInner: React.FC<StripePaymentInnerProps> = ({
  amount,
  onSuccess,
  onValidate,
  isProcessing: isProcessingExternal = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log("🟢 [StripeForm] MOUNTED. ID:", Math.random().toString(36).substr(2, 5));
    return () => console.log("🔴 [StripeForm] UNMOUNTED (Possible Crash Cause)");
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || isProcessingExternal) {
      return;
    }
    setMessage(null);

    // Run validation if provided
    if (onValidate && !onValidate()) {
      return; // Validation failed, errors will be shown in parent component
    }

    if (!stripe || !elements) {
      setMessage('Stripe is still loading. Please try again in a moment.');
      return;
    }

    console.log("👉 [Submit] Button Clicked");
    console.log("👉 [Submit] Stripe Obj:", !!stripe);
    console.log("👉 [Submit] Elements Obj:", !!elements);

    const paymentEl = elements?.getElement('payment');
    console.log("👉 [Submit] Found Mounted Element?:", !!paymentEl);

    if (!paymentEl) console.error("❌ [CRITICAL] Payment Element is MISSING before confirm!");

    setIsSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Payment failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess();
      return;
    }

    setMessage('Payment confirmation requires additional steps. Please try again.');
    setIsSubmitting(false);
  };

  const isBusy = isSubmitting || isProcessingExternal;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-stone-900 font-sans">Payment Method</h3>
        <p className="text-sm text-gray-500 font-sans">All transactions are secure and encrypted.</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 font-sans">
        <span className="rounded border border-gray-200 px-2 py-1">Visa</span>
        <span className="rounded border border-gray-200 px-2 py-1">Mastercard</span>
        <span className="rounded border border-gray-200 px-2 py-1">Amex</span>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <PaymentElement />
      </div>
      {message && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {message}
        </div>
      )}
      <button
        type="submit"
        disabled={isBusy}
        className={`w-full py-3 rounded-lg font-bold text-base tracking-wide transition font-sans ${
          isBusy
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-stone-900 text-white hover:bg-stone-800'
        }`}
      >
        {isBusy ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {isSubmitting ? 'Processing...' : 'Preparing...'}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <span aria-hidden>🔒</span>
            Pay ${amount.toFixed(2)}
          </span>
        )}
      </button>
      <p className="text-xs text-gray-500 font-sans">
        Total: ${amount.toFixed(2)}
      </p>
    </form>
  );
};

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  clientSecret,
  onSuccess,
  onValidate,
  isProcessing,
}) => {
  const appearance = useMemo(
    () => ({
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#1c1917',
        colorText: '#1c1917',
        colorBackground: '#ffffff',
        colorDanger: '#dc2626',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        borderRadius: '6px',
      },
    }),
    []
  );

  const elementsOptions = useMemo(
    () => ({
      clientSecret,
      appearance,
    }),
    [clientSecret, appearance]
  );

  if (!clientSecret || clientSecret.length === 0) {
    console.warn('[StripeElements] Skipping render: missing clientSecret');
    return null;
  }

  console.log('[StripeElements] Rendering', {
    clientSecretPrefix: `${clientSecret.slice(0, 6)}...`,
    clientSecretLength: clientSecret.length,
    clientSecretHasSecret: clientSecret.includes('_secret_'),
    publishableKeyPrefix: (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').slice(0, 7),
  });

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={elementsOptions}
    >
      <StripePaymentInner
        amount={amount}
        onSuccess={onSuccess}
        onValidate={onValidate}
        isProcessing={isProcessing}
      />
    </Elements>
  );
};

export default StripePaymentForm;
