# FONKORA — Currency and indicative price guide (2026-11-20)

## User-facing design
- Brand: فونكورا — FONKORA (initial web-name search did not find an identical phone shop; no legal exclusivity claim)
- Header controls: USD / new Syrian pound / old Syrian pound
- Every published device shows a preliminary USD guide price and the equivalent in both SYP units when an up-to-date reference rate is available.
- Rates are fetched by Cloudflare Worker from LiraScope Damascus market and labelled with the last source timestamp. A clearly labelled international reference fallback may be used if the Damascus rate cannot be obtained.
- **100 old SYP = 1 new SYP**.
- If rate unavailable, dollar estimate remains visible; the page does not invent a Syrian pound conversion.
- Changing the top currency selector updates cards, details and the advisor's manual budget currency; preference is saved locally.

## Database safety
A new `public.phone_price_guides` table has:
- `model_slug` (foreign key to phone_models)
- `usd_estimate` (positive numeric)
- `basis` (plain-language disclaimer)
- `is_approved=false` for the first batch
- `revised_at` timestamp

All 56 model records have an initial guide price, including 26 unpublished drafts. RLS policy limits anon SELECT to published models; anon INSERT, UPDATE, DELETE are blocked. `phone_variants` remains untouched: zero published sale variants, zero available inventory and no active checkout.

**Prices are illustrative planning figures — not verified November 2026 market quotes, manufacturer MSRPs, firm offers, stock availability or customer-specific discounts.** The owner must enter and approve real SKU- and variant-specific prices, colors, tax/delivery and stock before selling.

## Representative conversion (illustration only)
If the reference exchange rate is 150 **new** SYP for 1 USD:
- $900 -> 135,000 new SYP -> 13,500,000 old SYP.
- $300 -> 45,000 new SYP -> 4,500,000 old SYP.
The amount changes with the API reference rate. Historical quote timestamps must remain visible to visitors.

## Acceptance tests
- Static three-currency format and misleading-price guard test in `tests/currency-prices.mjs`.
- Mobile browser QA on actual Cloudflare deployment: 30 catalog cards and price guide labels, the currency selector changed to all 3 values and converted prices consistently; source/time visible and no horizontal scrolling.
- Android WebView's configured homepage changed to the new branded URL. A rebuilt APK has **not** been verified.

## Remaining
1. Get owner's approved sellable SKU prices.
2. Enable authenticated administration and audit log for price changes.
3. Implement stock, checkout, delivery, WhatsApp messages and loyalty.
4. Perform formal trademark/domain checks and obtain product image commercial licenses.
