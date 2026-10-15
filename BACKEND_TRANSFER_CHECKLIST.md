# Backend Transfer Checklist

## Local implementation status (2026-10-15)

This status covers repository code and the local runtime diagnosis. `.env` values were not inspected or printed. Running the storefront against its configured database reproduced a schema mismatch: Prisma reports that `Product.type` is missing. No migration, seed, reset, or production service was run. A migration-status read could not start because Prisma's schema engine was blocked (`EPERM`); the escalation retry was rejected by the automatic approval service after the account usage limit was reached.

- [x] Retain this project's actual stack: Next.js 14 / React 18 / Auth.js Credentials / Prisma 5 / PostgreSQL.
- [x] Keep the Arabic RTL storefront and existing CSS/layout while connecting its product, cart, checkout, and order paths to backend data.
- [x] Audit all 20 existing pages before edits; leave 19 complete pages, their shared components, and styling untouched. Complete the missing `/` redirect and extend the partial product-detail page to show persisted product facts only.
- [x] Add the four requested product types plus `HOME_CLEANING` to preserve the inspected existing cleaning catalog, with optional skincare/fragrance details. One product is one sellable SKU; package size is a label, not a clothing size/color variant.
- [x] Add hashed guest-cart cookies, stored account/guest carts, server-held price snapshots, bounded quantities, checkout idempotency, Decimal totals, conditional inventory decrement, and immutable order line snapshots.
- [x] Protect every current admin mutation with a database-backed role check and add audit records for catalog, inventory, order status, content, settings, and notification-read changes.
- [x] Remove the hardcoded seeded administrator; add an explicit one-time process-only bootstrap command and guard demo seeding.
- [x] Add a baseline snapshot and additive PostgreSQL migration. They have not been applied. The local storefront reproduction confirms the configured database lacks at least `Product.type`; the full live schema and migration history remain unverified.
- [x] Add unit tests for catalog validation, phone normalization, cart bounds, checkout input, and order transitions.
- [ ] Verify that `.env` and all deploy environments point to a database and secrets created only for this store. This was intentionally not checked by reading values.
- [ ] Confirm the configured database belongs exclusively to this store and identify whether it is disposable development, staging, or production. Keep it untouched until its owner/environment and migration plan are confirmed.
- [ ] Review the live database schema and migration history, safely baseline only if it matches the initial snapshot, then apply the backend migration to an independent disposable database and verify it before considering any shared environment.
- [ ] Resolve currency, tax, shipping charges/regions, product-specific compliance disclosures, expiry/batch tracking, return/refund policy, guest order retrieval, retention, MFA/rate limits, and deployment operations before production.
- [x] Run backend unit tests and app typecheck after the page-only changes: all six tests pass and TypeScript passes. Prisma schema validation/client generation passed in the earlier backend stage.
- [ ] Verify an optimized production build for the current revision. `npm run build` failed before Next.js because Prisma could not unlink a locked generated engine DLL (`EPERM`); direct `npx next build apps/web` failed spawning a Next.js worker (`EPERM`). The earlier successful build predates the page-only changes.
- [ ] Run PostgreSQL integration/concurrency tests on an independent disposable database and perform an authorized staging purchase.

See [the implementation report](docs/BACKEND_IMPLEMENTATION.md) for the source comparison, migration procedure, decisions, and verification limitations.

Use this checklist to build an independent backend for the skincare, personal-care and home-fragrance store. Every policy marked “decide” must be settled for the new business; it is not inherited from Organza Fashion.

## 1. Project and infrastructure

- [ ] Choose the new repository layout, runtime, framework, package manager and supported versions. If retaining the source stack, pin compatible Next.js, React, Prisma client/CLI/adapter and Node versions.
- [ ] Create a separate project, database, deployment environment and secrets. Do not copy source customer/order records, sessions, password hashes, credentials or production data.
- [ ] Provision PostgreSQL and define local/staging/production connection roles. Keep runtime and direct migration URLs separate where the provider uses a pooler.
- [ ] Decide whether the new service needs only a web backend or also an optional AI service, WhatsApp, Cloudinary/object storage or other providers.
- [ ] Set up structured logs, request IDs, health/readiness checks, backup/restore and secret rotation before production.
- [ ] Choose and document canonical HTTPS origin, ingress/Host validation, TLS and deployment platform. Set up independent DNS and service accounts.

## 2. Resolve target-store domain and policy decisions before schema work

- [ ] Define product types and the SKU/variant dimensions customers actually purchase: for example volume/size, scent, formulation, kit/bundle, or another approved dimension. Do not carry Color/Size fields by default.
- [ ] Decide which product facts are required for skincare/personal care: ingredients, use instructions, skin suitability, warnings, claims, product volume, manufacturer and any legally required information for each selling market.
- [ ] Decide which fragrance/air-care facts are required: scent profile, room/fabric use, size/volume, safe-use warnings, storage and any flammability or shipping restrictions relevant to the selected products/market.
- [ ] Decide whether batch/lot, expiry date, opened-product shelf life, recall/traceability, allergens or regulatory metadata need first-class data and audit history. These are new requirements; they are absent from the source schema.
- [ ] Decide whether one product has one SKU or multiple purchasable SKUs; specify whether options change price, image, stock, weight or shipping restrictions.
- [ ] Choose supported locale(s), countries, phone identity format, currency and tax treatment. Remove hardcoded ILS/Arabic/Organza/Farasha assumptions.
- [ ] Define fulfillment rules: flat zones vs carrier quotes, shipping price, lead time, backorders, delivery tracking, partial shipment and address validation.
- [ ] Define payment methods and workflows: online gateway, cash, transfer, manual proof, refunds, partial refunds, payment retries and reconciliation.
- [ ] Define order states and allowed transitions, cancellation deadlines, restock rules, returns/exchanges/refunds, sale exclusions and customer notifications.
- [ ] Decide loyalty/promotions. The source fifth-order 15% discount is business-specific; do not inherit without approval.
- [ ] Decide whether guest checkout is allowed, how guests retrieve orders/receipts, and how long guest cart/order tokens live.
- [ ] Define privacy, retention, consent and deletion policies for address data, receipts, chat, notifications, logs and order history.

## 3. Database and migrations

- [ ] Create a new Prisma schema or equivalent that reflects approved catalog, SKU, category, media, user/customer, address, cart, order, payment/shipping, settings and audit requirements.
- [ ] If using PostgreSQL and Prisma, generate a clean initial migration for the new database. Do not replay the clothing project's full historical migration series as the new app's baseline.
- [ ] Implement unique constraints for identity, localized slugs, SKU codes, order numbers and checkout idempotency keys.
- [ ] Add DB-level checks for nonnegative prices/stock/totals, positive order/cart quantities, valid shipping durations and other invariants that must hold under concurrency.
- [ ] If keeping SIMPLE products, make the one-default-SKU rule transactionally enforceable. Define the variant-product default rule too.
- [ ] Define FK delete behavior deliberately. Preserve immutable order snapshots if a catalog SKU is archived/deleted. Decide whether product deletion is blocked or soft-archives rather than mutating historical orders.
- [ ] Add indexes for real list/filter/lookups: published catalog/category, SKU availability, carts, customer orders, status/date, notifications and audit queries.
- [ ] Add explicit order-status history or ensure audit events capture every transition if support/compliance requires a timeline.
- [ ] Choose whether StoreSettings is a singleton and enforce it; distinguish typed business fields from flexible JSON configuration.
- [ ] Avoid mutable JSON for data that needs uniqueness, reporting, validation, foreign keys or stable queries.
- [ ] Decide whether to enable PostgreSQL RLS. If not, restrict DB credentials to trusted server runtime and audit all owner-scoped queries.
- [ ] Verify the new migration chain on a disposable PostgreSQL database and confirm deployed migration status before launch.

## 4. Authentication, customer data and authorization

- [ ] Choose identity providers and login identity; define normalization and uniqueness rules.
- [ ] Implement password hashing with a reviewed adaptive hash, generic login errors and timing-aware unknown-account handling if credentials are used.
- [ ] Define session strategy, lifetime, Secure/HttpOnly/SameSite cookies, CSRF/origin expectations and logout.
- [ ] Reload current role/permissions server-side for protected operations; never trust browser-supplied role or owner IDs.
- [ ] Add role/permission model appropriate to support, inventory, content, finance and super-admin workflows. Do not assume CUSTOMER/ADMIN is sufficient.
- [ ] Restrict profile/address/order reads and writes by authenticated owner. Verify ownership inside the mutation transaction.
- [ ] Implement address default uniqueness and transactional reassignment if saved addresses are supported.
- [ ] Add login/register/password-change rate limits, brute-force monitoring, recovery/reset flows and MFA/phone verification if required.
- [ ] Implement a one-time first-admin provisioning process that does not include default credentials or secrets in source, examples or automatic deployment jobs.
- [ ] Review public guest-order confirmation: do not expose contact/address details based only on a predictable identifier.

## 5. Catalog, media, pricing and inventory

- [ ] Build server-side validation for product text, locale, slugs, categories, price, compare-at price, status, SKU option schema and image references.
- [ ] Choose publication/archive behavior and ensure inactive products/SKUs/categories cannot be newly purchased.
- [ ] Implement a product attribute schema for approved skincare/fragrance requirements, with clear optional vs required fields and localized content.
- [ ] Implement SKU-level price and stock. Decide whether lot/batch inventory is needed; the source has a single quantity per SKU and no movement ledger.
- [ ] Keep product images in approved object storage/CDN. Validate content type, file signature and size; use private storage for customer/payment documents. Decide provider asset deletion/retention behavior.
- [ ] Define multi-currency and tax calculations. Always derive money and currency on the server; never trust client totals.
- [ ] Define active-sale price semantics, effective dates, promotion stacking and immutable sale snapshots if used.
- [ ] Add inventory adjustment reason, actor and before/after audit data. Consider an append-only stock movement ledger.
- [ ] Decide how oversell is prevented across simultaneous checkouts. Use transactions/row locks or atomic conditional decrements, with rollback on any order creation failure.
- [ ] Keep cart as a request only unless inventory reservation with expiry and cleanup is explicitly designed.

## 6. Cart, checkout, orders and payment/shipping

- [ ] If allowing guest cart, generate high-entropy random cookie token, store only its digest, set HTTP-only/Secure/SameSite and define expiry/cleanup.
- [ ] If merging cart after login, serialize merge, lock relevant SKU rows and cap/remove quantities against current availability.
- [ ] Rebuild checkout quote from database state. Sign owner/cart/items/prices/currency/expiry; reject changed cart or stale prices.
- [ ] Use an idempotency key with a unique database constraint so client retries cannot create duplicate orders.
- [ ] In one transaction, lock cart/SKUs, revalidate publication/price/stock, decrement inventory conditionally, create order and immutable line snapshots, write payment state, and consume/convert the cart.
- [ ] Use Decimal-safe arithmetic and calculate tax/shipping/discount server-side from current config.
- [ ] Snapshot product name, SKU/options, image, quantity, unit price, currency, taxes/discounts/shipping needed to explain the purchase later.
- [ ] Define order numbers with adequate entropy and customer privacy; keep internal IDs out of public URLs where possible.
- [ ] Enforce allowed order-state transitions server-side and record actor, timestamp and previous/next state.
- [ ] Implement cancellation/restock/refund in one well-defined transaction or workflow. Prevent duplicate restock and refund.
- [ ] For gateway payments, verify signed webhooks and idempotently record provider events. For manual transfer, secure receipt storage and make review state explicit.
- [ ] Define guest receipt/order retrieval using a separate signed owner token; apply no-store/private cache headers.
- [ ] Integrate carrier quotes/tracking only after defining supported regions and cancellation/partial-shipment behavior.

## 7. Admin and integrations

- [ ] Gate every admin page, route handler and server action with server-side authorization.
- [ ] Add audit events for catalog, stock, price, publication, order state, payment, refund, settings and role changes. Keep secrets and unnecessary PII out of metadata.
- [ ] Implement search/filter/sort/pagination on the server with bounded page sizes and valid query enums.
- [ ] Add dashboard thresholds as configuration with server-side validation and explain the threshold semantics.
- [ ] If adding notifications, write outbox event in the same transaction as the order/state change. Dispatch after commit, claim rows atomically, retry only when provider response is known safe, and expose admin review.
- [ ] Configure an external scheduler explicitly; a protected endpoint alone does not run background jobs.
- [ ] If adding AI, use a separate service token and short-lived signed user identity. Expose a fixed allowlist of validated read-only tools through the web server, never direct SQL or model-selected credentials.
- [ ] If adding AI rate limiting, use shared/distributed storage for multi-instance production.
- [ ] Configure Cloudinary/WhatsApp/Gemini/payment/carrier secrets only in the appropriate server secret manager. Keep optional integrations unable to block core storefront startup unless explicitly required.

## 8. Tests and verification

- [ ] Add unit tests for all validators, pricing, locale/phone normalization, cart merge, status transitions and signed checkout token handling.
- [ ] Add integration tests against disposable PostgreSQL for migrations, constraints, default SKU rules, owner scoping, transactions, rollback and concurrent stock contention.
- [ ] Test two concurrent checkouts for the last units of one SKU; only available quantity may be committed.
- [ ] Test duplicate checkout retry, stale/altered quote, changed SKU price, changed active status and inventory race.
- [ ] Test cancellation, order deletion policy, restock exactly once, refund idempotency and status history.
- [ ] Test customer cannot read/edit another customer's profile, address, cart, order, receipt or exchange/return request.
- [ ] Test admins with different roles cannot exceed their permissions.
- [ ] Test file content signatures, size boundaries, provider rejection, unauthorized upload and asset deletion/retention behavior.
- [ ] Mock external providers in unit tests; separately run explicitly authorized staging delivery tests.
- [ ] Run lint, typecheck, build, schema validation, migration deploy/status and full test suites in CI. Keep production data out of tests.
- [ ] Document which guarantees are unit-tested, PostgreSQL-tested, provider-tested and production-observed.

## 9. Production readiness

- [ ] Use separate staging/production databases and least-privilege credentials.
- [ ] Deploy checked-in migrations only and record migration status.
- [ ] Configure canonical HTTPS origin, secure cookies, trusted ingress, TLS database policy, pool bounds and connection timeouts.
- [ ] Configure secrets for web and any optional services; rotate examples/test values and verify none are client-visible.
- [ ] Verify backups and restore procedure with a separate environment.
- [ ] Verify health/readiness endpoints do not leak connection strings, database names, provider errors or secrets.
- [ ] Verify rate limits, abuse monitoring, logging/retention, audit access and incident response.
- [ ] Run a controlled staging purchase with test SKUs, test payment provider and approved notification recipient.
- [ ] Check product policy/ingredient/warning disclosures and shipping restrictions for the actual countries and product range before production launch.
- [ ] Confirm privacy, payments, consumer protection and product-labeling requirements with qualified local reviewers; the source project does not implement skincare/fragrance compliance rules.

