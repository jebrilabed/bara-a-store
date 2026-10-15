# Backend implementation report

Updated 2026-10-15. The implementation is local code only. I did not inspect or print `.env` values. During follow-up diagnosis, I started the app locally and requested `/ar`; its server-side product query reached the database configured by `.env` and failed with Prisma error `The column Product.type does not exist in the current database.` No customer/order/session data was read, and no migration, seed, reset, or data modification was performed. Prisma migration status could not be read: the schema engine failed to spawn with `EPERM`, and the approval retry was blocked by the automatic approval service's usage limit.

## Project inspected

- Next.js 14.2.15 App Router, React 18.3.1, TypeScript 5.6.2, NextAuth 5 beta, Prisma 5.20, PostgreSQL.
- The current implementation is a single Next.js app with direct Prisma reads, Auth.js credentials, a browser `localStorage` cart, one products API route, and a minimal transactional order endpoint.
- There was no migration history, test suite, environment example, AI service, payment gateway, shipping provider, notification outbox, or audit log. The root package exposed `prisma db push` and the seed script created a manager with a source-controlled password.
- The current storefront is Arabic and RTL. Its pages, components, brand assets, and `globals.css` were preserved; integration changed data loading and mutation behavior while reusing the existing classes and layouts.

## Transfer-document comparison

| Area | Existing project | Reused/adapted behavior |
| --- | --- | --- |
| Authentication | Credentials + JWT, bcrypt, role string | Kept Auth.js and existing bcrypt hashes; normalized email, bcrypt cost 12 for new passwords, 8-hour session, current database role lookup, and server-side admin checks on mutations. |
| Catalog | One product row with Float price and flat stock | Added the four requested product families plus `HOME_CLEANING` because the inspected storefront and seed already contain household cleaners. Added optional typed skincare/fragrance facts, a SKU code, package label, Decimal price, server validation, archive behavior, and audit events. One product row is one sellable stock unit. |
| Cart | Browser-only, client-provided metadata | Added guest/account carts in PostgreSQL, HttpOnly random guest token with digest at rest, safe legacy-cart import, account merge, quantity bounds, and server product reads. Price snapshots stay server-side; changed prices are surfaced for confirmation. |
| Checkout | Stock read before transaction, unconditional decrement, client sent item IDs | Server uses stored cart items, verifies each server-held price snapshot against the current price, locks the cart, locks products in stable order, conditionally decrements stock in a transaction, persists immutable line snapshots, and deduplicates retries with a unique key. |
| Orders | String status, product relation, no line snapshots | Kept the existing visible states and added an explicit transition graph, cancellation restock in the same transaction, order snapshots, ownership scope, and admin audit rows. |
| Admin | Page layout checked role; mutations generally did not | Admin layout reads current role; each admin mutation checks authorization again and audits catalog, stock, order, content, settings, and notification-read changes. |
| Payments/fulfillment | Checkout displayed ILS and COD only | Retained that existing flow. No fee/tax/discount, transfer receipt, refund, carrier, returns, or exchange policy was invented. |

The source clothing rules that do not apply (color/size combinations, fifth-order promotion, and clothing exchange eligibility) were not added. The optional AI and WhatsApp service designs were not copied because this project does not use those integrations.

## Product model and business boundaries

`ProductType` supports `SKINCARE`, `PERSONAL_CARE`, `HOME_CLEANING`, `HOME_FRAGRANCE`, and `AIR_FRESHENER`. `HOME_CLEANING` preserves the existing `clean` category in this project's inspected seed/catalog; it does not introduce a clothing option. The migration also maps known `skin`, `scent`, `clean`, and air-freshener category slugs to their corresponding type, and gives existing products a generated SKU code. Unknown categories default to `PERSONAL_CARE` and should be reviewed before launch. Product facts are optional fields, not legal claims or compliance validation: ingredients, skin suitability, scent profile, usage instructions/area, safety warnings, storage instructions, manufacturer, and package size. No field assumes apparel dimensions or color.

This implementation uses one product row and one SKU per purchasable unit. Different volumes/formulations/scents that must have separate prices or stock are entered as separate products with their own SKU. There is no SKU variant matrix, batch/lot ledger, expiry tracking, recall support, or ingredient-regulatory review. Product disclosures and shipping restrictions must be decided for the actual products and markets before launch.

The storefront currently labels amounts in ILS and accepts cash on delivery. Totals are computed server-side from Decimal prices; shipping, tax, promotions, refunds, and partial shipments are absent. These current UI choices need owner review before production sales.

## Database and migration safety

Two PostgreSQL migrations now exist:

1. `20261015000000_initial_schema` records the old schema that was present in `prisma/schema.prisma` before these changes.
2. `20261015001000_backend_foundation` adds product facts/types, decimal money, carts, order snapshots/idempotency, audit records, indexes, and database checks.

The first migration is a baseline, not a migration to run over already-created tables. On an empty, independent database, both migrations create the final schema. On an existing database, inspect the live schema and migration history first; only if it matches the initial snapshot should an operator mark that baseline applied, then deploy the backend migration. The reproduced runtime error confirms the currently configured database is behind the code at least for `Product.type`; its complete schema, migration history, ownership, and environment classification are still unverified. Do not run a migration against it until its owner/environment is confirmed and the baseline is reviewed. The backend migration adds/changes columns, enum types, constraints, indexes, foreign keys, and monetary column types; it was not applied. No `db push`, reset, seed, or database write was performed.

## Runtime error reported after implementation

The production-style Server Components message was reproduced locally in Next.js development mode on a separate port. The actionable server log is a Prisma schema mismatch: `Product.type` does not exist in the configured database, while the updated Prisma client and storefront query expect it. The CSS preload warning is unrelated to the HTTP 500. This needs a reviewed migration on a confirmed independent target database; it is not fixed by changing CSS or hiding the query failure. The configured database was not migrated because its ownership/environment could not be confirmed, and migration-status inspection was blocked before it could run.

## Frontend route audit and page-only completion

Audited the existing App Router pages before editing. Existing home, product listing, category listing/details, search, cart, checkout, customer order history, login, registration, account, and all eight admin pages were present and database-backed or connected to the existing backend workflow. Those page files and their shared components were left unchanged. The product detail page was present but only showed its image, name, description, price, and add-to-cart action; `/` had no route. Added optional persisted product facts and category/type details to the product detail page, and added a root redirect to `/ar`. The detail page shows only values recorded for that product and an explicit empty message when optional facts are absent.

No separate order-detail route or SKU-variant workflow was added: the existing order-history page has no detail navigation, and the current product model deliberately represents one purchasable product/SKU per row. Implement those only after a concrete workflow and schema are agreed. No completed storefront or admin page, styling file, shared component, or database file was changed for this page-only task.

Verification after these page changes: `npm run typecheck` passed; `npm run test:backend` passed all six tests. `npm run build` stopped during `prisma generate` because Windows denied unlinking the generated query-engine DLL (`EPERM`). A direct `npx next build apps/web` then stopped because Next.js could not spawn a build worker (`EPERM`). The earlier full build recorded above was from before these page changes and does not verify the current revision. No lint script is configured. A local browser attempt could not connect to port 3001, so visual runtime verification was unavailable. The previously reproduced database schema mismatch remains unresolved and no database migration was applied.

The app's `.env` is untouched. `.env.example` contains placeholders for a separate store database and unique Auth.js secret. Use independent local, staging, and production URLs; do not copy records, password hashes, cookies, credentials, or secrets from another store.

## Security and operational limits

- Session identity and current role are reloaded from PostgreSQL; submitted roles, owner IDs, prices, and stock are ignored.
- Guest cart tokens have 256 bits of randomness, are HttpOnly/SameSite=Lax, and only SHA-256 digests are stored. Cart and order APIs use private no-store responses.
- Checkout accepts only validated contact fields and a retry key. A server-held cart price snapshot is checked against the current database price; an order transaction serializes cart access and uses sorted conditional stock updates, so competing checkouts cannot decrement below zero.
- Order status changes are limited to `NEW → PREPARING/CANCELLED`, `PREPARING → SHIPPED/CANCELLED`, and `SHIPPED → DONE`. A successful cancel from an eligible state restocks once, guarded by a compare-and-set status update.
- Admin provisioning is manual and one-time through an explicit process environment. The demo seed no longer creates any account and refuses production execution.
- There is no login rate limit, password reset/MFA, fine-grained admin role, customer address book, outbox worker, retention/anonymization task, distributed rate limiter, or RLS policy. Health, backup/restore, TLS, ingress, provider, and deployment settings remain unverified.
- The guest receives only the existing generic order confirmation. There is no guest order-detail or receipt retrieval endpoint.

## Verification record

Verification on 2026-10-15: all six backend-policy tests passed; Prisma schema validation passed; Prisma Client generation passed to `apps/web/src/generated/prisma`; the Next app TypeScript check passed; and the optimized production build completed successfully. The ordinary Node test runner initially hit Windows `EPERM` when spawning its isolated worker, so the test script uses `--test-isolation=none`. Generation initially tried to replace a locked client under `node_modules`; using the dedicated generated-client directory resolved that issue. No PostgreSQL integration/concurrency tests or external-provider tests were run.
