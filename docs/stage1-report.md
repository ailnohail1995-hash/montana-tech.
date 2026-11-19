# Montana — Stage 1: verified phone catalogue

**State (2026-11-19):** read-only public demonstration, NOT an operating store.

## Live application
- Cloudflare Worker: https://montana-tech-demo.montanatech21.workers.dev/
- Supabase project: `wxdspknjbbnarqnhptdx` in `mobile21`
- GitHub: https://github.com/ailnohail1995-hash/montana-tech. (note: name contains a trailing period)
- The Cloudflare Worker is currently deployed **manually**, because GitHub/Cloudflare Pages integration returned 8000011. GitHub pushes do **not** automatically redeploy this Worker.

## Implemented
- New premium mobile-first RTL interface and inline SVG icon system.
- Six distinct product reference photos, each with its own credited source link.
- Official, sourced real hardware specifications in Supabase.
- Real, read-only public catalogue (public `phone_models` and `phone_variants` with RLS).
- Two-phone comparison; quantitative capacity differences shown without pretending larger MP/battery automatically means superior test performance.
- Preference matching based on published strengths. Budget fit is **not asserted** while prices are unknown.
- `/api/rates`: Cloudflare proxy for LiraScope USD market bid/ask in **new SYP**, cached, with international reference fallback explicitly labeled when market data is unavailable. Reference rates are not guaranteed retail rates.
- Switch between **new SYP** and **old SYP** (old = new ×100), both distinguished from USD.
- Local favourites / PWA static offline fallback. The live FX feed and Supabase catalogue are not cached by service worker.

## Six initial models
1. Galaxy S25 Ultra — https://www.samsung.com/us/smartphones/galaxy-s25-ultra/
2. Galaxy A56 5G — https://www.samsungmobilepress.com/media-assets/galaxy-a56-5g?tab=specs
3. Xiaomi 15 Ultra — https://www.mi.com/global/product/xiaomi-15-ultra/specs/
4. POCO X7 Pro — https://www.mi.com/global/product/poco-x7-pro/specs/
5. HONOR 400 Pro — https://www.honor.com/sd/phones/honor-400-pro/spec/
6. iPhone 16 Pro — https://www.apple.com/newsroom/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/

**Media provenance:** product images currently reference manufacturer or third-party product imagery through distinct URLs and include source links. Before commercial launch, replace any third-party references with approved manufacturer media or store-owned licensed photos, and verify image permissions, consistency, accuracy, and availability.

## Pricing and Syrian currency
- **No invented retail prices.** No published product variants exist yet; all six phones display *السعر عند الطلب*.
- Public FX ticker is **informational**, and market rate source/time are visible; conversion is not a binding store quote.
- As of 2026, Syrian currency redenomination ratio: **100 old SYP = 1 new SYP**. The UI offers an explicit toggle to avoid confusing denominations.
- `store_currency_settings` is deliberately inaccessible to anonymous users; an authenticated admin interface and signed audit trail must be designed before managers can edit prices or rates.
- A future approved `phone_variants` row can hold USD price and/or a fixed new-SYP selling price, SKU, storage, RAM, colour and stock. Orders must always re-check authoritative price, stock and FX on the server before acceptance.

## Security verification
Read-only SQL audit on 2026-11-19:
- 5 brands, 6 published phones, 0 sale variants.
- 6/6 have official source URLs and image reference URLs.
- All 4 tables have RLS enabled.
- `anon`: catalog SELECT permitted, INSERT on phone_models denied, private FX settings SELECT denied.
- Supabase security advisor reported informational lint `rls_enabled_no_policy` for private store_currency_settings, intentionally default-deny.
- No customer accounts, orders, checkout or real payments are active. Do not expose a Supabase secret / service_role key or private customer data.

## Acceptance testing
Cloudflare Browser Rendering mobile viewport (390×844): 6 visible product cards, 6 distinct image URLs; live catalog loaded without fallback; displayed USD/SYP ticker from Damascus market, rate was **150 new SYP** and had a timestamp. This checks rendered HTML, **not** device installation, image licensing, payment security or every interaction.

## Next steps (not in stage 1)
Production-grade administrative authentication and upload pipeline, verified price list, stock, order & delivery system, WhatsApp/contact details, loyalty, notifications, and APK release QA. All require further implementation.
