# Stripe Payment Flow – Deep Audit Report (Diagnostic Only)

**Issue:** Stripe Dashboard shows two PaymentIntents per order: one for product total (Succeeded), one for shipping fee (e.g. $10 or $20, Incomplete). Expected: a single PaymentIntent for the grand total (subtotal + shipping + extras).

**Scope:** Frontend checkout, `create-payment-intent` Edge function, and any Stripe/cart usage. No code changes were made; this is report-only.

---

## 1. Where are PaymentIntents created?

**Single creation point:**

| Location | File | Line |
|----------|------|------|
| `stripe.paymentIntents.create(...)` | `supabase/functions/create-payment-intent/index.ts` | **122** |

There is no other `stripe.paymentIntents.create` or `paymentIntents.create` in the repo. There is no logic that creates a PaymentIntent “just for the shipping fee”; every call goes through this function and uses one combined amount (see below).

**Who calls it:**

| Caller | File | Line |
|--------|------|------|
| `supabase.functions.invoke('create-payment-intent', { body: { amount: amountInCents } })` | `src/pages/CheckoutPage.tsx` | **1062–1066** |

So: one backend that creates one PaymentIntent per request, and one frontend that calls it with a single `amount` (in cents). Two PaymentIntents therefore imply **two separate invocations** of `create-payment-intent` with **two different** `amountInCents` values (first call = product-only total, second call = product + shipping total).

---

## 2. How is the backend `amount` calculated?

**Backend:** `supabase/functions/create-payment-intent/index.ts`

- **Lines 46–51:** Request body is parsed as `items`, `amount` (as `amountFromBody`), `couponCode`, `shippingCost`. If `amountFromBody` is a valid number, it is used as the single amount in cents.
- **Lines 72–81:** If that amount is not provided or invalid, the backend falls back to `itemsSubtotalInCents + shippingInCents` (from `items` and `shippingCost` in the body).
- **Lines 118–125:** One PaymentIntent is created with `amount: finalAmount` (after optional coupon), i.e. one combined charge.

**Important:** The frontend currently sends **only** `{ amount: amountInCents }` (CheckoutPage.tsx **1065**). It does **not** send `items` or `shippingCost`. So the backend always uses the frontend’s single `amount` and never recomputes from items/shipping on the server. The backend logic is correct for a single combined charge; the problem is that the frontend calls it twice with different amounts.

**Frontend amount (what is sent as `amount`):**

| Concept | Definition | File:Line |
|--------|------------|-----------|
| `subtotal` | Sum of cart item totals | CheckoutPage.tsx **820** |
| `currentShippingFee` | From `deliveryZonePrice` (single address) or from `splitShipments` (multi-address) | **822–836** |
| `shippingCost` | `currentShippingFee + seasonalSurcharge` | **843** |
| `baseTotal` | `subtotal + shippingCost` | **844** |
| `amountInCents` | `round(baseTotal * 100) - discountAmountInCents` (≥ 0) | **862–865** |

So when the frontend sends `amount: amountInCents`, it **does** intend to send the grand total (subtotal + shipping + surcharge − discount). The bug is not “shipping not added on the backend”; it is that the frontend **creates a first PaymentIntent when the amount is still “product only” (no shipping)** and a **second** when shipping is later included.

---

## 3. Double API calls / useEffect behaviour

**When is `create-payment-intent` called?**

Only from the effect in CheckoutPage that depends on `amountInCents` and `hasStableAmount`:

```ts
// CheckoutPage.tsx 1095–1117
useEffect(() => {
  // ... guards (hasOtherState, hasStableAmount, amountInCents, dedup by lastPaymentAmountRef)
  fetchClientSecret();
}, [amountInCents, hasStableAmount]);
```

So:

- Selecting a shipping method or zone (or anything that changes `amountInCents` or `hasStableAmount`) can trigger this effect.
- When it runs and the guards pass, it calls `fetchClientSecret()` → one `create-payment-intent` request per run.

**Root cause of two PaymentIntents:**

- **`hasStableAmount`** (lines **868–876**) is what decides “we know the final total”:
  - **Pickup:** `true` immediately → amount is stable with **shipping = 0**.
  - **Delivery, single address:** `true` only when `deliveryZonePrice !== null` (zone selected).
  - **Delivery, multi-address:** `true` **immediately** (line **871**: `if (shippingMethod === 'delivery' && isMultiToAddress) return true`), even before any address is filled.

So:

1. **Pickup:** As soon as the user is on checkout with pickup, `hasStableAmount === true` and `currentShippingFee === 0` → `baseTotal = subtotal` → first **create-payment-intent** call with **product total only** → **first PaymentIntent (product total)**. If the user then switches to delivery and selects a zone, `amountInCents` changes to include shipping → effect runs again → second **create-payment-intent** call → **second PaymentIntent (grand total)**. The UI then uses the second client secret; the first PaymentIntent is never completed → shows as Incomplete.

2. **Delivery + multi-address:** `hasStableAmount` is true from the first render, but `splitShipments` is initially empty (or without valid VIC postcodes), so `currentShippingFee === 0` (see reduce in **824–833**). So first run: `baseTotal = subtotal`, `amountInCents` = product total only → **first PaymentIntent (product total)**. When the user fills in addresses and shipping is computed, `currentShippingFee` becomes non-zero, `amountInCents` changes → effect runs again → **second PaymentIntent (grand total)**. Again, two intents; the first can appear as “product total” and the second as “with shipping” (or the first Incomplete, second Succeeded).

So: **yes**, changing shipping method or (for multi-address) filling in addresses triggers a **new** API call that **creates a new** PaymentIntent. The “double” call is not from a bug in the backend or from a separate “shipping-only” intent; it’s from the effect running twice with two different `amountInCents` values (first without shipping, second with shipping).

**Exact locations:**

- **`hasStableAmount`** treating pickup and multi-address delivery as “stable” even when shipping is still 0: **CheckoutPage.tsx 868–876**.
- **`currentShippingFee`** being 0 when no zone (single) or no/empty `splitShipments` (multi): **CheckoutPage.tsx 822–836**.
- Effect that calls `fetchClientSecret()` when `amountInCents` or `hasStableAmount` changes: **CheckoutPage.tsx 1095–1117**.

---

## 4. Is there an update mechanism?

**Finding:** There is **no** use of `stripe.paymentIntents.update()` in the codebase.

When the total changes (e.g. user adds shipping by selecting a zone or filling addresses), the app **always** creates a **new** PaymentIntent via a new `create-payment-intent` call and replaces `clientSecret` with the new one (CheckoutPage **1076**). The previous PaymentIntent is left in Stripe (typically “incomplete”), which is why the dashboard shows two intents: one for the first (often product-only) amount and one for the updated (grand total) amount.

---

## 5. Root cause summary

| Question | Answer |
|----------|--------|
| **Where are PaymentIntents created?** | Only in `supabase/functions/create-payment-intent/index.ts` at line **122**. No “shipping-only” path. |
| **Is shipping added to the backend amount?** | The backend uses a single amount from the request. The frontend is supposed to send the grand total in `amount`; it does not send `items`/`shippingCost`. So the split is not on the backend; it’s from **two requests** with two different `amount` values. |
| **Does selecting shipping trigger a new API call?** | Yes. Changing shipping method or zone (or, for multi-address, filling addresses) changes `amountInCents` and/or `hasStableAmount`, which re-runs the effect and calls `fetchClientSecret()` again, creating a **new** PaymentIntent. |
| **Update vs create?** | No update. The app always creates a new PaymentIntent when the amount changes; the old one is abandoned (Incomplete). |

**Exact logic that leads to “product total” vs “product + shipping” intents:**

- **CheckoutPage.tsx 868–876:** `hasStableAmount` is `true` for **pickup** and for **delivery + isMultiToAddress** even when the shipping fee is still 0.
- **CheckoutPage.tsx 822–836:** For multi-address, `currentShippingFee` is 0 until `splitShipments` has valid VIC addresses; for single-address delivery it uses `deliveryZonePrice` (null until zone is chosen).
- So the **first** effect run can happen with `baseTotal = subtotal` (product total only) and the **second** with `baseTotal = subtotal + shipping`, producing the two PaymentIntents you see (one for product total, one for full amount; one Succeeded, one Incomplete).

No code has been changed. Awaiting your confirmation before suggesting or implementing a fix.
