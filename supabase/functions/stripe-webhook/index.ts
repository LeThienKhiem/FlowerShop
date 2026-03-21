import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const emailJsServiceId = Deno.env.get("EMAILJS_SERVICE_ID") ?? "";
const emailJsTemplateId = Deno.env.get("EMAILJS_TEMPLATE_ID") ?? "";
const emailJsUserId = Deno.env.get("EMAILJS_USER_ID") ?? "";
const emailJsPrivateKey = Deno.env.get("EMAILJS_PRIVATE_KEY") ?? "";

if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing required environment variables for stripe-webhook");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.error("Missing orderId in session metadata");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "Processing",
        payment_status: "succeeded",
        stripe_payment_id: session.payment_intent,
      })
      .eq("id", orderId);

    if (error) {
      console.error("Failed to update order status:", error);
      return new Response("Failed to update order", { status: 500 });
    }

    const customerEmail = session.customer_details?.email ?? "";
    const customerName = session.customer_details?.name ?? "";
    const amountTotal = typeof session.amount_total === "number"
      ? (session.amount_total / 100).toFixed(2)
      : "";

    if (!emailJsServiceId || !emailJsTemplateId || !emailJsUserId || !emailJsPrivateKey) {
      throw new Error("Missing EmailJS environment variables");
    }

    if (customerEmail) {
      try {
        const emailResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: emailJsServiceId,
            template_id: emailJsTemplateId,
            user_id: emailJsUserId,
            accessToken: emailJsPrivateKey,
            template_params: {
              to_email: customerEmail,
              to_name: customerName,
              order_id: orderId,
              total_amount: amountTotal,
              reply_to: "magnoliaflowers.au@gmail.com",
            },
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`EmailJS error: ${emailResponse.status} ${errorText}`);
        }
      } catch (emailError) {
        console.error("Failed to send EmailJS confirmation:", emailError);
      }
    }

    console.log("🚀 PREPARING ADMIN EMAIL...");
    console.log("Admin to_email:", "magnoliaflowers.au@gmail.com");

    const adminBody = JSON.stringify({
      service_id: emailJsServiceId,
      template_id: emailJsTemplateId,
      user_id: emailJsUserId,
      accessToken: emailJsPrivateKey,
      template_params: {
        to_email: "magnoliaflowers.au@gmail.com",
        to_name: "Admin",
        order_id: orderId,
        total_amount: amountTotal,
        reply_to: customerEmail,
      },
    });
    console.log("Sending Payload:", adminBody);

    try {
      const adminEmailResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: adminBody,
      });

      const adminResponseText = await adminEmailResponse.text();
      console.log(`Admin Email Result: Status ${adminEmailResponse.status}, Body: ${adminResponseText}`);

      if (!adminEmailResponse.ok) {
        throw new Error(`EmailJS error: ${adminEmailResponse.status} ${adminResponseText}`);
      }
    } catch (adminEmailError) {
      console.error("Admin Email Exception:", adminEmailError);
    }
    console.log("--- END DEBUG ---");
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
