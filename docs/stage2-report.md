# Montana — Phase 2: comparison, advisor, filters and accessory-fit

Implemented on `main` (19 Nov 2026). Deployment target: https://montana-tech-demo.montanatech21.workers.dev/

## Delivered
- **Advanced catalog filters:** numeric battery capacity, display size, published refresh rate, chipset family, **priced variants only** (never invent prices), and documented sorting choices.
- **Comparison:** two real model records, focus on gaming, photography, battery, or daily use; optionally hide equal specs. Commentary explains where spec numbers do **not** establish real-world superiority.
- **Explainable advisor:** first selected preference has greater weight; each suggestion lists matched and unmatched requirements. Budget accepts USD or new/old SYP with reference exchange rate. **Missing retail prices are explicitly disclosed**, and no false promise of budget suitability is shown.
- **Alternatives in product detail:** compare models with overlapping confirmed strength tags and similar screen sizes, without making unsupported cheaper/better claims.
- **Accessory guide:** six categories and six per-model compatibility profiles in Supabase. Statuses distinguish USB-C *connector* suitability from model-specific size fit and items needing verification.
- **Shareable links:** `?phone=<slug>` and `?compare=<slug>,<slug>&focus=<type>`; personal favourites remain local to the device.
- **Mobile-first RTL styling:** compact advanced controls, comparison insights, advisor results, and modal detail tabs.
- PWA shell caches `stage2.js` and rotates the cache version.

## Database
Supabase project `wxdspknjbbnarqnhptdx` under account `tomjontom21@gmail.com`.

Migration applied: `create_stage2_accessory_compatibility_profiles`.

New tables:
- `public.accessory_families` (6 published)
- `public.phone_accessory_profiles` (6 models)

Both have RLS enabled and SELECT-only published policies for `anon`/`authenticated` roles; no public INSERT, UPDATE or DELETE permissions. No customer data or payments.

Source URLs for connector types:
- [Galaxy S25 Ultra Samsung Canada](https://www.samsung.com/ca/business/smartphones/galaxy-s/galaxy-s25-ultra-sm-s938wzgaxac/)
- [Galaxy A56 Samsung UK](https://www.samsung.com/uk/smartphones/galaxy-a/galaxy-a56-5g-awesome-lightgrey-256gb-sm-a566bzaceub/)
- [Xiaomi 15 Ultra](https://www.mi.com/global/product/xiaomi-15-ultra/specs/)
- [POCO X7 Pro FAQ](https://www.mi.com/global/support/faq/details/KA-528065/)
- [HONOR 400 Pro](https://www.honor.com/pk/phones/honor-400-pro/spec/)
- [iPhone 16 Pro Apple](https://support.apple.com/en-gb/121031)

The connection type does NOT verify charger safety, cable power rating, charge speed, Bluetooth codec support, MagSafe certification, or exact case / screen protector fit. Specific merchandise compatibility must be verified before selling.

## Tested
1. Source syntax of `stage2.js`, `app.js`, and `sw.js` validated.
2. Verified DOM IDs and bundle order, manifest JSON, and service-worker asset list.
3. V8 decision-function tests: battery preference, alternatives overlap, catalogue sort.
4. Live Cloudflare browser (mobile viewport 390×844) executed interaction QA:
   - filter battery at 6000mAh => 2 models
   - clear filters => all 6
   - comparison battery focus => proper insight visible
   - show-only-differences => works
   - advisor => explanation plus no invented prices
   - accessory guide => 6 categories
   - detail modal => 3 tabs, 2 alternatives for chosen device
   - all checks passed
5. Separate rendered-page QA: **all 6 distinct model images loaded with nonzero intrinsic width**; accessory profiles loaded from Supabase, USB-C status surfaced; model-specific case/protector warning surfaced.
6. Supabase SQL audit: 6 published family rows, 6 profiles, RLS on both, anon SELECT allowed but INSERT/UPDATE blocked.
7. Supabase security advisor: only INFO `rls_enabled_no_policy` on intentionally private `store_currency_settings`.

## Limitations and next actions
- All six phones still lack owner-approved sellable variants/prices; do not claim any device is inside a given budget.
- Accessory categories are advisory, not stocked sellable SKUs, and no accessory can be ordered yet.
- Third-party phone imagery still needs a rights/usage review before commercial rollout.
- Checkout, delivery and customer accounts, push notifications, WhatsApp and loyalty are stage 3.
- GitHub Actions workflow added and updated, but no completed GitHub Actions run was verified through connector; live browser QA passed.
- Cloudflare worker was updated manually because GitHub-to-Pages installation continues to fail. GitHub `main` updates are NOT auto-deployed.
- No production Android APK has been built or tested as part of this phase.
