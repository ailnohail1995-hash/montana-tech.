# Montana — embedded transparent product photographs

Implemented and tested: 2026-11-19.

## What changed
All **six published phone models** now use unique, compact transparent-background WebP assets owned and served by the Montana deployment. The cards and details no longer rely on the previous third-party image URLs, and no AI-generated phone mockups are displayed as authentic product photos.

### Asset sources and hosting
- Original photographs were retrieved from the existing documented product media URLs (manufacturers and third-party vendor image pages).
- The extraction pipeline scales each photo to a **480×480** contained composition, preserves existing transparency where present, removes *edge-connected background* where possible, and converts it to WebP.
- Six version-controlled text assets are in `assets/products/<slug>.webp.b64`. Each is a base64 encoded **real WebP binary**, not a placeholder or illustration.
- The connected Cloudflare Worker `montana-product-images` holds the decoded image payloads and serves `https://montana-product-images.montanatech21.workers.dev/<slug>.webp`.
- The store site exposes its own URLs: `https://montana-tech-demo.montanatech21.workers.dev/assets/products/<slug>.webp`, redirecting to the managed image Worker.
- The read-only `public.phone_models.image_url` values in Supabase refer to these store URLs.
- The PWA service-worker static asset list includes all six phone images. Cache capability still needs a full offline install test on real Android devices.
- Temporary image-processing worker was deleted after assets were successfully installed.

### Included models
- Samsung Galaxy S25 Ultra — `galaxy-s25-ultra.webp.b64`
- Samsung Galaxy A56 5G — `galaxy-a56-5g.webp.b64`
- Xiaomi 15 Ultra — `xiaomi-15-ultra.webp.b64`
- POCO X7 Pro — `poco-x7-pro.webp.b64`
- HONOR 400 Pro — `honor-400-pro.webp.b64`
- Apple iPhone 16 Pro — `iphone-16-pro.webp.b64`

Each media file is between approximately 5 and 12 KB after compression.

### Confirmed QA
Cloudflare Browser Rendering mobile Chrome simulation (390×844) verified:
- All six storefront image URLs resolve.
- All six images rendered with `naturalWidth = 480` and `complete = true`.
- The computed CSS `background-color` of the first product image is transparent.
- The processed Galaxy S25 Ultra WebP has alpha=0 in four corners and alpha=255 on the handset.
- Supabase image URLs now point at the app's own media paths.

### Accuracy, copyright and future imports
The photographs are real source images, but public availability **does not grant commercial reuse rights**. Obtain permission or licensed manufacturer assets before launching paid storefront marketing, particularly for third-party retailer images. Keep model-specific media and colour consistent with its actual SKU; do not substitute invented generic phone artwork. The existing `image_credit_url` records are retained for provenance.

For each newly imported model:
1. Verify the model and release status against manufacturer source.
2. Verify technical specs and regional variant.
3. Obtain approved product image(s), remove the background, optimize and put them in app-owned assets.
4. Add a dedicated image route and update `image_url` only once the image route is tested.
5. Re-test alpha corners, actual product appearance, mobile loading and offline cache.

**The requirement to populate many more current devices is not yet fulfilled.** This change fixes the media pipeline for the six current products; adding more brands/models requires separate verified import batches. No fabricated prices, stock or unverified models were inserted.
