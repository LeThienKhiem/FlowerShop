import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: 'Stripe secret key not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Supabase credentials not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    const { items, amount: amountFromBody, couponCode, shippingCost } = body;

    // Single combined charge: use one amount only. Prefer explicit amount (grand total in cents).
    const amountInCents = typeof amountFromBody === 'number' && Number.isFinite(amountFromBody)
      ? Math.round(amountFromBody)
      : null;

    const calculateSubtotalFromItems = (cartItems: unknown): number => {
      if (!Array.isArray(cartItems)) return 0;
      return cartItems.reduce((total, item) => {
        if (!item || typeof item !== 'object') return total;
        const record = item as Record<string, unknown>;
        const price = Number(record.price);
        const salePrice = Number(record.sale_price);
        const quantity = Number(record.quantity ?? 1);
        const validPrice = Number.isFinite(price) ? price : 0;
        const validSalePrice = Number.isFinite(salePrice) ? salePrice : NaN;
        const unitPrice = Number.isFinite(validSalePrice) && validSalePrice > 0 && validSalePrice < validPrice
          ? validSalePrice
          : validPrice;
        if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity) || quantity <= 0) return total;
        return total + Math.round(unitPrice * 100) * quantity;
      }, 0);
    };

    // Use frontend grand total when provided (items + extras + shipping - discount). Otherwise fallback to items + shipping.
    let baseAmountInCents: number;
    if (amountInCents !== null && amountInCents > 0) {
      baseAmountInCents = amountInCents;
    } else {
      const itemsSubtotalInCents = calculateSubtotalFromItems(items);
      const shippingInCents = Number.isFinite(Number(shippingCost))
        ? Math.round(Number(shippingCost) * 100)
        : 0;
      baseAmountInCents = itemsSubtotalInCents + shippingInCents;
    }

    if (!baseAmountInCents || baseAmountInCents <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .single();

      if (couponError || !coupon || !coupon.is_active) {
        return new Response(JSON.stringify({ error: 'Invalid or inactive coupon code.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let discountAmount = 0;
      const discountType = String(coupon.discount_type).toLowerCase().trim();
      if (discountType === 'percent' || discountType === 'percentage') {
        discountAmount = Math.round(baseAmountInCents * (coupon.value / 100));
      } else if (discountType === 'fixed' || discountType === 'amount') {
        discountAmount = Math.round(coupon.value * 100);
      }

      if (discountAmount > 0) {
        console.log(`Applying Coupon: ${couponCode}, Discount: ${discountAmount} cents`);
        baseAmountInCents = Math.max(baseAmountInCents - discountAmount, 0);
      }
    }

    const finalAmount = Math.max(baseAmountInCents, 50);

    // Single charge: one PaymentIntent for the full grand total (never separate product vs shipping).
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
    });

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create payment intent.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
