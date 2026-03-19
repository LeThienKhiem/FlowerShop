import React, { useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

interface StripePaymentFormProps {
  amount: number;
  clientSecret: string;
  onSuccess: () => void;
  onValidate?: () => boolean;
  /** If provided, runs before confirmPayment. Returns orderId string or null on failure. Charge only proceeds if non-null. */
  onBeforeConfirm?: () => Promise<string | null>;
  isProcessing?: boolean;
}

type StripePaymentInnerProps = Omit<StripePaymentFormProps, 'clientSecret'>;

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const StripePaymentInner: React.FC<StripePaymentInnerProps> = ({
  amount,
  onSuccess,
  onValidate,
  onBeforeConfirm,
  isProcessing: isProcessingExternal = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('[Pay] Submit clicked', { isSubmitting, isProcessingExternal, hasStripe: !!stripe, hasElements: !!elements });

    if (isSubmitting || isProcessingExternal) {
      console.warn('[Pay] Blocked: already submitting or parent is processing');
      setMessage(isSubmitting ? 'Payment in progress...' : 'Please wait, payment is initialising...');
      return;
    }
    setMessage(null);

    if (onValidate) {
      const valid = onValidate();
      if (!valid) {
        console.warn('[Pay] Blocked: validation failed (check required fields above)');
        setMessage('Please fix the errors above (e.g. email, phone, delivery date) and try again.');
        return;
      }
    }

    if (!stripe || !elements) {
      console.warn('[Pay] Blocked: Stripe not ready', { stripe: !!stripe, elements: !!elements });
      setMessage('Stripe is still loading. Please try again in a moment.');
      return;
    }

    const paymentEl = elements?.getElement('payment');
    if (!paymentEl) {
      console.error('[Pay] Blocked: Payment Element not mounted');
      setMessage('Payment form not ready. Please wait a moment and try again.');
      return;
    }

    if (onBeforeConfirm) {
      setMessage(null);
      const orderId = await onBeforeConfirm();
      if (!orderId) {
        setMessage('Could not prepare order. Please try again.');
        return;
      }
    }

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
  const isButtonDisabled = isSubmitting || !stripe;

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
        disabled={isButtonDisabled}
        className={`w-full py-3 rounded-lg font-bold text-base tracking-wide transition font-sans ${
          isButtonDisabled
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
  onBeforeConfirm,
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
    return null;
  }

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
        onBeforeConfirm={onBeforeConfirm}
        isProcessing={isProcessing}
      />
    </Elements>
  );
};

export default StripePaymentForm;
