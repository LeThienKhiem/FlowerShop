# Pre-Flight Code Audit Report

**Scope:** Read-only health check before go-live.  
**Date:** 2025-01-30.

---

## 1. Critical Logic Verification (Recent Fixes)

| Check | Result | Details |
|-------|--------|---------|
| **Shop "Feature on Shop" sorting** | ✅ **PASS** | `src/pages/Shop.tsx` uses `show_on_home` for "Feature on Shop" dropdown sort. Categories sorted by: (1) `show_on_home` first, (2) selected, (3) alphabetical. Fetches `show_on_home`, `is_featured` from DB. |
| **Email Subject vs Body Order ID** | ✅ **PASS** | Checkout confirmation uses a single `displayOrderId` from `getDisplayOrderId(rawOrderId)`. Both `order_id` and `email_subject` (e.g. `Order Confirmed #${orderIdStr}!`) are derived from it. `NewOrderEmail` receives `orderId={displayOrderId}` and renders `#{orderId}` with no second transform. Subject and body use the same value. |
| **PromotionPopup once-per-session** | ✅ **PASS** | Uses `localStorage` key `seen_promo_${id}`. Checks `localStorage.getItem(storageKey(p.id))` before showing; if missing, shows popup. On close or CTA, `localStorage.setItem(storageKey(promo.id), 'true')`. Correct one-time behaviour. |

---

## 2. Production Readiness

### 2.1 Leftover Debugging

| Severity | Location | Notes |
|----------|----------|--------|
| 🟡 **WARNING** | `src/pages/CheckoutPage.tsx` | ~28 `console.log` / `console.error` / `console.warn`: render-state logs (e.g. "🎨 [CheckoutPage Render]", "Rendering StripeForm?"), PaymentIntent request/response logs, order-insert debug, email payload logs, security log `console.log` on every event. |
| 🟡 **WARNING** | `src/components/Checkout/StripePaymentForm.tsx` | Module-level `console.log('Stripe Key loaded:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)`; mount/unmount logs; `console.log` in parent with `clientSecret` prefix, length, `includes('_secret_')`, and publishable key prefix. |
| 🟡 **WARNING** | `src/pages/ProductDetail.tsx` | Many `console.log`/`console.error` around fetch, retries, UUID vs numeric ID, Supabase responses. |
| 🟡 **WARNING** | `src/pages/AdminOrders.tsx` | Verbose fetch debug (`=== FETCHING ORDERS ===`, Supabase client, result, first order sample, "Rendering first order", etc.). |
| 🟡 **WARNING** | `src/pages/AdminCategory.tsx` | `console.log` for category updates, verification, `is_featured` checks; multiple `console.error` in handlers. |
| 🟡 **WARNING** | `src/components/FloralShop.tsx` | Featured-categories fetch debug (`console.log`/`console.error` for query results, `is_featured` checks). |
| 🟡 **WARNING** | `src/main.tsx` | `console.log('App initialized (start|end)')`; `console.warn`/`console.error` for unhandled errors and promise rejections (may be intentional for monitoring). |
| 🟡 **WARNING** | `src/lib/email.ts` | `console.log('Email Payload Items:', ...)`, `console.log('Order confirmation email sent successfully:', ...)`. `sendOrderEmails` is **not** used for checkout; confirmation is sent from `CheckoutPage` via EmailJS. |
| 🟡 **WARNING** | `src/lib/syncCategories.ts` | Many `console.log`/`console.warn`/`console.error` (CLI sync script; less critical for production frontend). |
| 🟢 **INFO** | **`debugger`** | None found. |

**Recommendation:** Remove or guard debug `console.log` in Checkout, Stripe form, ProductDetail, Admin flows, and FloralShop. Keep `console.error` in catch blocks only where useful for production monitoring.

### 2.2 Hardcoded Values & URLs

| Severity | Location | Notes |
|----------|----------|--------|
| 🔴 **CRITICAL** | `src/components/AdminLayout.tsx` | **Hardcoded admin password** `'Nicky.12345'` in source. Must be removed; use env-based or proper auth before deploy. |
| 🔴 **CRITICAL** | `src/components/FloralShop.tsx` | Own Supabase client with **hardcoded** `SUPABASE_URL` and `SUPABASE_ANON_KEY` (`sb_publishable_kjq9y-ClW1XgZR9mo9hiOg_lf8G2jqx`). Used for `/` (home). Bypasses `lib/supabase` and env. |
| 🔴 **CRITICAL** | `src/lib/syncCategories.ts` | **Hardcoded** `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same anon key as above). Node script; still risky if run in shared/CI environments. |
| 🟡 **WARNING** | `src/lib/supabase.ts` | `VITE_SUPABASE_URL` fallback `'https://rfalymblhmqkjgajlktp.supabase.co'`; `VITE_SUPABASE_ANON_KEY` fallback `''`. URL fallback ties app to one project; empty key prevents usage if env missing. |
| 🟡 **WARNING** | `src/lib/email.ts` | Hardcoded Supabase URL in `getValidImageUrl`; `VITE_SHOP_EMAIL` fallback `'info@magnoliaflowers.com.au'`. |
| 🟡 **WARNING** | `src/components/Header.tsx` | Hardcoded logo URL `https://rfalymblhmqkjgajlktp.supabase.co/storage/.../logo_black.png`. |
| 🟡 **WARNING** | `src/components/FloralShop.tsx` | Hardcoded founder image URLs and `bannerhero.avif` Supabase storage URLs. |
| 🟢 **INFO** | `localhost` | No `localhost` / `127.0.0.1` in `src/`. Only in `PROJECT_SUMMARY.md`, `CATEGORY_SETUP_GUIDE.md`, and build output (`dist`); not runtime app code. |

### 2.3 Environment Variables & Dangerous Defaults

| Severity | Location | Notes |
|----------|----------|--------|
| 🔴 **CRITICAL** | `FloralShop` / `syncCategories` | Hardcoded anon key in source (see above). |
| 🟡 **WARNING** | `StripePaymentForm` | `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')`. Empty fallback can break Stripe init; key also logged. |
| 🟡 **WARNING** | `CheckoutPage` / `email.ts` | EmailJS: `VITE_EMAILJS_*` fallback to `''`; send skipped if missing. Safe but worth ensuring env set in prod. |
| 🟢 **INFO** | `syncCategories` | Uses `process.env.SUPABASE_SERVICE_ROLE_KEY` for service-role client when set; otherwise anon. |

---

## 3. Potential Risks

### 3.1 Type Safety (`any`, `@ts-ignore`)

| Severity | Location | Notes |
|----------|----------|--------|
| 🟡 **WARNING** | `src/pages/CheckoutPage.tsx` | `newOrder: any`, `customerDetails: any` for order payload (lines ~1034, 1045). Structural typing relaxed; ensure shape matches backend. |
| 🟡 **WARNING** | `src/pages/AdminOrders.tsx` | `address?: any`, `[key: string]: any` in item interfaces; `extractItemOptions(item: any)`, `formatOptionValue(value: any)`, `items.map((item: any, ...)`. |
| 🟡 **WARNING** | `src/pages/AdminProducts.tsx` | `formatValue` / `escapeValue` (value: any); `(product: any)`, `(item: any)`, `(category: any)` in map/filter. |
| 🟡 **WARNING** | `src/components/email/OrderReceipt.tsx` | `(item as any).selectedOptions ?? (item as any).selected_options`; `renderOptionValue(value: any)`. |
| 🟡 **WARNING** | `src/components/FloralShop.tsx` | `productsData.map((product: any))`, `filter((product: any))`, etc. |
| 🟡 **WARNING** | `Home`, `CategoryPage`, `SearchOverlay`, `FlowerShopPage`, `AdminDashboard` | Various `(p: any)`, `(product: any)`, `(value: any)` in map/format. |
| 🟢 **INFO** | **`@ts-ignore` / `@ts-expect-error`** | None found. |

### 3.2 Unused Code & Bundle Impact

| Severity | Location | Notes |
|----------|----------|--------|
| 🟡 **WARNING** | `src/components/FlowerShopPage.tsx` | Not referenced in `App.tsx` routes. Alternative shop page; effectively dead code. Consider removing or wiring up. |
| 🟡 **WARNING** | `src/lib/email.ts` → `sendOrderEmails` | Exported but never called. Checkout uses EmailJS directly from `CheckoutPage`. Dead code unless used elsewhere (e.g. future backend flow). |
| 🟡 **WARNING** | `src/components/FloralShop.tsx` | "Legacy hardcoded products" block: `&lt;section className="hidden"&gt;` with ~50 lines of legacy product UI + `legacyProducts` data. Adds bundle weight and noise. |
| 🟢 **INFO** | CheckoutPage icons | `ShoppingBag`, `Truck`, `Store`, `Phone` from `lucide-react` are all used. |

---

## 4. Summary Tables

### 🔴 CRITICAL (fix before deploy)

| # | Item | Action |
|---|------|--------|
| 1 | Hardcoded admin password in `AdminLayout.tsx` | Move to env or proper auth; remove from source. |
| 2 | Hardcoded Supabase anon key in `FloralShop.tsx` | Use `lib/supabase` and env vars; remove duplicate client and keys. |
| 3 | Hardcoded Supabase anon key in `syncCategories.ts` | Use env vars (and service role where appropriate). |

### 🟡 WARNING (should fix)

| # | Item | Action |
|---|------|--------|
| 1 | Debug `console.log` in Checkout, Stripe, ProductDetail, Admin, FloralShop, main, email | Remove or gate behind `import.meta.env.DEV` (or similar). |
| 2 | StripePaymentForm logging key/clientSecret details | Remove debug logs; avoid logging secret fragments. |
| 3 | Hardcoded Supabase URL fallbacks and asset URLs | Prefer env or config; avoid tying app to single project URL in code. |
| 4 | `loadStripe(..., \|\| '')` | Ensure `VITE_STRIPE_PUBLISHABLE_KEY` is set in prod; avoid empty fallback. |
| 5 | `any` in checkout order payload and admin/email types | Tighten types where possible, especially for order/payment-related data. |
| 6 | Unused `FlowerShopPage`, `sendOrderEmails`, FloralShop legacy block | Remove or wire up; reduces confusion and bundle size. |

### 🟢 INFO (verification passed / low risk)

| # | Item |
|---|------|
| 1 | Shop "Feature on Shop" uses `show_on_home` correctly. |
| 2 | Email subject and body use the same order ID (display) in checkout flow. |
| 3 | PromotionPopup `localStorage` one-time logic is correct. |
| 4 | No `debugger` statements. |
| 5 | No `@ts-ignore` / `@ts-expect-error`. |
| 6 | No `localhost` in app source. |
| 7 | EmailJS config missing → send skipped (no throw). |

---

## 5. EmailJS Template Reminder

Checkout sends `order_id` and `email_subject` (e.g. `Order Confirmed #21007!`). Ensure the EmailJS template **Subject** uses `{{email_subject}}` so the subject matches the body. If you use `{{order_id}}` only, it should still match, since both come from the same `displayOrderId`.

---

*End of report. No files were modified.*
