# Backend Transfer Manifest

This manifest identifies source files to inspect when reproducing the backend in the independent skincare and home-fragrance store. Classification is about using the module or its design; no file contains authorization to copy customer/order data, credentials or production state.

## Core infrastructure and schema

| Path | Purpose and dependencies | Classification | Why / changes for the new store |
| --- | --- | --- | --- |
| package.json; package-lock.json | npm workspace scripts and exact web dependency lock; apps/web workspace | Adapt | Same Next.js stack can be retained if selected. Rename workspace/package and use a new lock/install. Do not blindly carry unused dependencies. |
| apps/web/package.json | Next/Auth.js/React/Prisma dependencies, DB and test scripts | Adapt | Pin and verify the new application versions; preserve compatibility across Prisma CLI/client/adapter. |
| prisma/schema.prisma | All current enums, tables, relations, indexes and generated client output | Adapt | Best source of the relational design, but rewrite clothing and business-policy assumptions. Add only target-approved skincare/fragrance fields and relations. |
| prisma/migrations/* | Ordered PostgreSQL DDL, checks, indexes, partial indexes, deferred SKU trigger | Adapt | Reuse individual constraints/patterns after review. Do not replay the fashion migration history as the second store's production migration chain. Create a clean baseline for the independent database. |
| prisma.config.ts | Prisma schema/migration paths, env loading and DIRECT_URL preference | Adapt | Change file paths if layout changes; keep runtime and migration credentials distinct. Do not import old URLs. |
| apps/web/src/lib/db/prisma.ts | Lazy PrismaPg client, pool error reporting, interactive transaction defaults/retry, SELECT 1 health helper | Adapt | Same adapter pattern may fit. Tune pool/transaction limits for new host and concurrency; review retry semantics and sanitize diagnostics. |
| apps/web/src/lib/db/database-pool-config.mjs | Pool bounds, TLS enforcement and serverless pooler adjustment | Adapt | Confirm new database provider and deployment environment; do not assume Supabase/Vercel. |
| apps/web/src/lib/db/database-error.mjs | Error categorization and password/message redaction | Adapt | Reuse safe error categories only after reviewing redaction against new provider errors. Avoid exposing technical detail publicly. |
| vercel.json | Vercel framework/install/build configuration | Adapt | Only if deploying web to Vercel; update root/build commands for the new monorepo. |
| apps/ai/Dockerfile | Python 3.12 non-root FastAPI container | Do not copy unless AI service is selected | Optional chat has separate requirements. It is unrelated to the core product/order backend. |

## Authentication and authorization

| Path | Purpose and dependencies | Classification | Why / changes for the new store |
| --- | --- | --- | --- |
| apps/web/src/auth.ts | Auth.js Credentials config, JWT callbacks, PrismaAdapter, phone/password authorize | Adapt | Account identity and login UX are store-specific. Review credentials, trustHost, callbacks, cookie/session policy and database adapter strategy. |
| apps/web/src/app/api/auth/[...nextauth]/route.ts | Auth.js GET/POST handler export | Reusable directly if retaining Auth.js | Keep only if the new app uses the same Auth.js integration/version. |
| apps/web/src/lib/auth/authorization.ts | Live user reload; requireUser/requireCustomer/requireAdmin and page guards | Adapt | Strong pattern for not trusting browser role/IDs; update roles/routes and redirects. |
| apps/web/src/lib/auth/current-user-reader.mjs; authorization-policy.mjs | Testable session-to-current-user and role policy helpers | Reusable directly or adapt | Small framework-independent helpers; retain semantics only if roles and identity model match. |
| apps/web/src/lib/auth/password-hash.mjs | Scrypt hash/verify functions | Adapt | Password storage design can inform the new store. Confirm security review and migration policy; never copy password hashes or users. |
| apps/web/src/lib/auth/phone.mjs | Arabic/Persian digit and phone normalization | Adapt | Phone-specific normalization is useful only if phone is the selected identity; adopt target-country canonicalization. |
| apps/web/src/app/[locale]/login/actions.ts; register/actions.ts | Credential sign-in and customer creation | Adapt | Current forms/routes and phone/address fields are localized; preserve server-side role assignment and generic failures if retaining credentials auth. |
| apps/web/src/app/[locale]/account/actions.ts; lib/storefront/address-ownership.mjs | Customer profile/address writes and ownership transaction helper | Adapt | Reuse owner-scoping/default-address pattern; update validation/locales/customer profile fields. |
| apps/web/scripts/bootstrap-admin.ts; update-admin-phone.ts | Explicit one-time admin bootstrap/update | Adapt cautiously | Keep manual and operator-controlled if needed; change schema/phone/business assumptions, never add production credentials to files or automatic deployment steps. |
| apps/web/src/types/next-auth.d.ts | Auth.js session type augmentation | Adapt | Keep in TypeScript app if using these fields; align with new session claims and roles. |

## Product catalog, categories, inventory and media

| Path | Purpose and dependencies | Classification | Why / changes for the new store |
| --- | --- | --- | --- |
| apps/web/src/lib/admin/catalog-validation.mjs | Product/category/variant/inventory input validation | Adapt | Contains Color/Size matrix, hex values, Arabic text and currency limits. Replace clothing variant fields with approved fragrance/cosmetic attributes and server-side bounds. |
| apps/web/src/app/(admin)/admin/actions.ts | Product/category create/edit/archive/delete, inventory writes, admin audit | Adapt | Direct Prisma implementation and custom product-delete side effects are store-specific. Rework deletion, SKU retention, category assignment and audit events. |
| apps/web/src/app/(admin)/admin/products/[id]/management-actions.ts | Generic SKU JSON options and product image/SKU admin actions | Adapt | Generic option path may fit, but SKU code prefix, image-color linkage and Cloudinary ID namespace are branded. Add ownership checks/audit for every mutation. |
| apps/web/src/lib/phase7/validation.mjs | Account/address/settings/SKU/image/delivery-zone validations and storeCurrency constant | Adapt | Several parsers are reusable patterns; current currency is hardcoded to ILS and image IDs are Farasha-prefixed. Replace locale, money, zones and provider constraints. |
| apps/web/src/app/api/admin/products/images/upload/route.ts | Same-origin/admin-gated Cloudinary upload with size/MIME/signature validation | Adapt if using Cloudinary | Provider integration is implemented. Update auth, bucket/path/ID conventions, size policy, retention and delete behavior. |
| apps/web/src/lib/seo/public-catalog.ts; apps/web/src/app/[locale]/(store)/page.tsx; products/[slug]/page.tsx; categories/[slug]/page.tsx | Public product/category reads, metadata, search and pagination | Adapt | Search is Arabic-name-only; sort parameter is ignored; product slugs/locales and fashion display are specific. Rebuild desired filtering/sorting and target domain display. |
| apps/web/src/lib/storefront/product-availability.ts | Labels for available/in-transit and shipping duration | Adapt | Availability has current clothing semantics; define accurate stock/backorder/lead-time behavior for the new store. |
| apps/web/src/lib/admin/inventory.ts; apps/web/src/app/(admin)/admin/inventory/page.tsx | Low-stock threshold and admin SKU inventory view | Adapt | SKU-level inventory pattern; update low-stock policy and dashboard fields. |
| apps/web/src/lib/seo/slug-redirects.ts; slug-redirect-plan.mjs | Preserve redirects when public slugs change | Reusable directly or adapt | Useful URL continuity pattern; retain locale/resource scoping and test new route shapes. |
| apps/web/src/components/admin/product-form.tsx; product-variant-section.tsx; product-image-uploader.tsx | Admin UI for product/variant/media workflows | Do not copy as backend | Frontend contains fashion-specific color/size and Arabic UI; implement new product-editor UX separately. |

## Cart, checkout, orders and payments

| Path | Purpose and dependencies | Classification | Why / changes for the new store |
| --- | --- | --- | --- |
| apps/web/src/lib/storefront/cart.ts; cart-workflow.mjs; config.ts | Guest token hash, signed-in cart, cart merge, quantity merge and 30-day cookie | Adapt | Good identity/merge patterns; update cookie namespace/lifetime and product rules. Cart does not reserve stock. |
| apps/web/src/app/[locale]/(store)/actions.ts | Cart mutations, checkout server action, receipt checks, retry recovery | Adapt | Must be server-only and revalidate all current prices/stock; replace locale, payment and delivery rules. |
| apps/web/src/lib/storefront/checkout-security.mjs | Signed owner/cart-bound checkout quote, expiry, fingerprint and idempotency key | Reuse security pattern; adapt integration | Valuable replay/price-change defense. Reimplement tests against the new identity, currency and quote model. |
| apps/web/src/lib/storefront/checkout-pricing.mjs | Decimal line totals and fifth-order 15% discount | Adapt | Decimal-safe totals are reusable; fifth-order loyalty rule is fashion-store policy. |
| apps/web/src/lib/storefront/orders.ts | Checkout transaction, row locks, conditional stock decrement, snapshots, transitions and cancellation restock | Adapt | Central behavioral reference. Replace business status graph/payment rules and reconsider order/product delete behavior. Preserve atomic stock/order/cart commit if appropriate. |
| apps/web/src/lib/storefront/order-workflow.mjs | Allowed order transitions and checkout parsing | Adapt | Transition graph, phone and localized form rules are domain/policy-specific. |
| apps/web/src/app/(admin)/admin/orders/actions.ts | Admin status/payment/exchange updates and order deletion | Adapt | Manual payment updates and high-impact delete/restock behavior need a new explicit policy. |
| apps/web/src/app/[locale]/(store)/orders/actions.ts; lib/storefront/exchange-policy.mjs | Customer exchange request and 12-hour non-sale rule | Do not copy policy; adapt code only after defining target returns/exchanges | This policy is not a generic commerce default and includes a transaction revalidation edge. |
| apps/web/src/lib/storefront/payment-settings.ts; apps/web/src/app/api/orders/[orderNumber]/payment-receipt/route.ts | Bank transfer configuration and private receipt download | Adapt if manual bank transfer is selected | No gateway/refund integration. Decide whether receipt bytes belong in PostgreSQL or private object storage. |
| apps/web/src/app/[locale]/(store)/checkout/page.tsx; components/storefront/checkout-form.tsx | Checkout page, signed quote, saved address prefill and form | Do not copy as backend | UI is Arabic-first and includes current payment/zone/discount assumptions. |
| apps/web/src/app/[locale]/(store)/orders/*; order-confirmation/* | Customer order history/detail/confirmation reads | Adapt | Keep owner-scoped reads; strengthen guest order confirmation with an owner-bound token if personal address/contact is shown. |

## Admin settings, integrations and optional features

| Path | Purpose and dependencies | Classification | Why / changes for the new store |
| --- | --- | --- | --- |
| apps/web/src/app/(admin)/admin/settings/actions.ts; lib/admin/config.ts | Store configuration, home editorial content, low-stock threshold, admin password change | Adapt | Remove hardcoded ILS and fashion copy; decide which store config belongs in typed columns vs JSON. |
| apps/web/src/app/(admin)/admin/content/actions.ts; lib/admin/content-validation.mjs | Translated FAQ/content pages and slug redirects | Adapt | Reusable CMS pattern; define new policy content and enabled locales. |
| apps/web/src/lib/notifications/order-events.mjs; apps/web/src/lib/whatsapp/*; apps/web/src/app/api/internal/notifications/dispatch/route.ts | Outbox event, Cloud API provider, retry and cron endpoint | Adapt or omit | Reuse outbox/claim/dedup design if WhatsApp is required. Reconfigure approved templates, consent, recipient policy and scheduler. |
| apps/web/src/lib/ai/*; apps/web/src/app/api/ai/*; apps/web/src/app/api/internal/ai/tools/route.ts | Chat identity, conversation ownership, fixed tool contract and web database reads | Do not copy unless AI is selected; adapt if selected | Tool descriptions, locales, order number regex, brand prompt and product fields are specific. Keep service credentials server-side and tools read-only. |
| apps/ai/app/*; apps/ai/requirements*.txt | FastAPI model/tool service and rate limiter | Do not copy unless AI is selected | Optional separate service, no DB. Update prompt/tool schemas/model config and use distributed limits for multi-instance production. |
| apps/web/src/lib/seo/*; apps/web/src/app/sitemap.ts; robots.ts | Public metadata, canonical links, structured data and sitemap | Adapt | Canonical origin, supported locale, item taxonomy and structured data need new-store values. |
| apps/web/next.config.ts | Server action body limit, CSP and security headers | Adapt | Review security policy against new providers/assets and deploy ingress; preserve no-secret client boundaries. |
| apps/web/.env.example; apps/ai/.env.example | Placeholder environment variable names | Adapt | Use as a checklist, not as credentials. Add only integrations chosen for the new project. |
| docs/*.md | Existing feature and operational guides | Do not copy verbatim | Some claims are stale relative to current source, especially currency and image upload. Use this manifest/spec and inspect code. |

## Behavioral references and materials to exclude

| Path/group | Purpose | Classification | Notes |
| --- | --- | --- | --- |
| apps/web/tests/*.test.mjs; apps/ai/tests/*.py | Unit/contract behavior for helper rules, route security, tools and deployment config | Adapt | Use as examples for new tests, but review each expectation against the new policies; they do not prove live DB/provider behavior. |
| prisma/schema.prisma and migrations | Schema implementation evidence | Do not copy customer/order data | Transfer only schema/code patterns. Create a separate database, credentials, migration baseline and dataset. |
| apps/web/public/brand/*; brand copy in pages and translations | Existing brand imagery and content | Do not copy | Organza/Farasha and apparel copy is project-specific. |
| Top-level delete_users.js, add_arrows.js, fix_unique.js, scratch_variants.js, update_*.js | Ad hoc workspace scripts | Do not copy or execute | Not application modules or a migration workflow; one script name explicitly suggests destructive user operations. |
| .env.local, apps/ai/.env, local DB credentials, generated/local data, node_modules | Local credentials/data/dependencies | Do not copy | Create independent secret values, database and install/build outputs. |
| contracts/ | Reserved directory | Do not copy as a contract source | No contracts were present in the inspected tree. |

