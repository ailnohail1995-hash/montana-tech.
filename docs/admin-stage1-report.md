# FONKORA — Secure Administration Panel, stage 1 (20 November 2026)

## Links

- Main storefront: https://fonkora-store.montanatech21.workers.dev/
- **Manager panel:** https://fonkora-store.montanatech21.workers.dev/admin
- Supabase project: https://supabase.com/dashboard/project/wxdspknjbbnarqnhptdx
- Source: `admin.html`, `admin.css`, `admin.js`, `app.js`
- Old Cloudflare demo URL also hosts the same administrator files for compatibility.

## What's implemented

1. Separate premium RTL mobile-first administrative UI with 7 areas: overview, phones, brands, catalog/accessory categories, SKUs/stock, guide prices, settings/security.
2. Manager authentication uses Supabase Auth passwordless email, default magic link, and optional OTP verification code if the email template is configured for codes.
3. Access rights are **enforced by Supabase Postgres Row Level Security (RLS)**. The UI is not the security boundary. Exactly one email is currently allowlisted in a non-exposed database schema: `tomjontom21@gmail.com`. The admin identity must be a **confirmed Supabase Auth user** for that email. The application does not contain a `service_role` key.
4. Data manager reads drafts and published models (30 published + 26 drafts at deployment); creates and edits model information, category, official specs URL, images and image credits, battery, display, processor, cameras, many additional structured specifications, strengths and notes.
5. New phones are saved as **unpublished drafts**; publishing requires a product image, image credit URL and verified date, and changing publishing state requests confirmation.
6. Brand management (name, Arabic label, slug, order, logo URL/image, visible/hidden).
7. **Two forms of categories**: general catalog categories (including phone and accessory types) and accessory compatibility families (connector/model-specific/universal check). Managers can add new categories in either form.
8. Variant management: SKU, RAM, storage, colour, USD price, fixed *new* SYP price, stock quantity, published/available flags. "Available" requires a positive stock count and price.
9. Price guide editing: owner can change the 56 trial USD guide prices; these remain explicitly **not approved** as binding prices, until the real sales process exists.
10. Browser image uploads to Supabase Storage bucket `fonkora-products`: PNG/JPEG/WebP compression to WebP (1200px maximum dimension, 2MB result), distinct path, publicly readable source; write allowed only to authorized manager. Photos can also be supplied via HTTPS URLs. Existing transparency is preserved; complex automatic subject cutout is *not* included.
11. Changes to catalog data are logged in `fonkora_private.catalog_audit` using triggers. Authenticated authorized manager can read recent events through a `security_invoker=true` public view subject to private-table RLS.
12. Customer storefront now reads dynamic brand display names and manager-defined published phone categories; the category filter updates from Supabase.

## Activation still needed by owner

**As of deployment there are 0 Supabase Auth users in this store project.** No manager has signed in or saved a product via the browser yet. The security helper currently denies all authenticated and unauthenticated users without a confirmed allowlisted Auth account.

1. Open Supabase project: https://supabase.com/dashboard/project/wxdspknjbbnarqnhptdx
2. Go to **Authentication → URL Configuration** and add to **Redirect URLs**:
   `https://fonkora-store.montanatech21.workers.dev/admin.html`
   Keep this exact origin/path; extra authorized hosts can be added if needed.
3. Ensure **Authentication → Providers → Email** is enabled. Supabase's default magic link template sends a link, not a 6-digit OTP; the manual-code form is only for deployments that have switched the email template to `{{ .Token }}`.
4. Open the Admin link, click **إرسال رابط أو رمز الدخول إلى البريد**, and open the link from `tomjontom21@gmail.com`.
5. The verified manager gets access to all seven sections and can save a first draft phone. No passwords or codes need to be shared with ChatGPT.
6. If the actual manager will use a different email, do **not** share the above inbox; update the `fonkora_private.admin_allowlist` on the project before that manager signs in. This is a privileged database operation.

## Security verification

Verified from Supabase:
- The initial public records remained present (30 published phones and 26 drafts prior to admin deployment).
- Admin privileges are granted exclusively through an RLS predicate backed by a **confirmed Supabase Auth user** and a private allowlist.
- Anonymous role could **not** INSERT `catalog_categories` (Postgres `42501 permission denied`).
- `authenticated` role without a verified Supabase user/JWT could **not** INSERT `catalog_categories` (`42501 row-level security`).
- Storage bucket restrictions enforce authorized JWT and names under `phones/`, `brands/`, `accessories/`.
- Eight tables contain audit triggers.
- Latest Supabase Security Advisor returned **no findings** after changing the audit endpoint to a security-invoker view and private RLS.
- Supabase session/refresh token stored in **tab-level sessionStorage**, not a password or public server-side token.

## QA performed

- Parsed `admin.js`, `app.js`; verified IDs of static admin forms, public category select, no embedded secret keys.
- Live Cloudflare mobile 390×844: opening `/admin` displays sign-in, keeps all management tabs hidden, loads manager CSS/JS, has no horizontal overflow.
- Live customer site, mobile 390×844: still shows 30 products, 30 guide price badges and latest reference FX, published category selector with `smartphones`, footer admin link, no horizontal overflow or catalog fallback.
- No actual OTP sign-in or authorized add/edit/upload transaction was tested: it requires the real owner to authenticate.
- CI: `tests/admin.mjs` added to existing GitHub workflow; no GitHub Actions success run was verified through this connector.
- Code deployment is currently manual using Cloudflare Worker script; GitHub `main` pushes alone do not update production.

## Not finished

- Owner's first verified login and end-to-end save/upload testing.
- Bulk CSV/Excel import and rollback UI; structured record version history with one-click restores.
- Actual checkout, order lifecycle, delivery & WhatsApp notifications, loyalty program.
- Staff roles and delegated permissions beyond a single allowlisted manager.
- Automatic real-world prices and stock verification; uploaded photos must have rights cleared, transparency may need manual background processing.
- APK rebuild, install and testing with the new admin link.
- Automated CI/CD repair for Cloudflare production deployment.
