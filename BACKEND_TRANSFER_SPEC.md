# Backend Transfer Specification
**Source reviewed:** Organza Fashion repository, 2026-10-15.  
**Scope:** Static inspection of checked-in application source, Prisma schema, migrations, environment examples, scripts, and test files. No application code or database was changed. Local populated environment files and live database contents were not read. Migration state, provider credentials, live integrations, and production behavior are unverified.

## 1. Project overview and stack

This is an Arabic-first, server-rendered clothing storefront. The core web application is a Next.js App Router application with server components, server actions, route handlers, and direct Prisma access. PostgreSQL is the only application database. A separate optional FastAPI service provides a customer chat assistant; it has no database connection and calls authenticated read-only tools on the web service.

| Area | Observed implementation |
| --- | --- |
| Runtime/package management | Node.js 20.9+; npm workspaces and package-lock.json. Python 3.11+ is stated in README; the AI Docker image uses Python 3.12. |
| Web | Next.js 16.3.8, React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4.3.3, ESLint 9.39.5. Exact versions are from the lockfile. |
| Authentication | Auth.js / NextAuth 5.0.0-beta.32, Credentials provider, Prisma adapter 2.11.3, JWT sessions. |
| Persistence | PostgreSQL, Prisma 7.10.0 and Prisma PostgreSQL adapter 7.10.0. Money uses Decimal(12,2); instants use timestamptz(3); JSON fields store snapshots/configuration. |
| AI service | FastAPI, Uvicorn, Pydantic Settings, LangChain Google GenAI. Requirements ranges: FastAPI >=0.115,<1; Uvicorn >=0.34,<1; Pydantic Settings >=2.8,<3; LangChain Google GenAI >=4.4,<5. No Python lockfile was found. |
| Tests | Node built-in node:test for web helpers/contracts; pytest and httpx for AI service. Existing tests are listed in §11; they were not run for this documentation task. |
| Deployment files | vercel.json configures the web build. apps/ai/Dockerfile creates a non-root Python image. These files do not prove either service has been deployed. |

### Repository layout

- apps/web: Next.js storefront, admin, route handlers, authentication, Prisma access, validation/workflows and unit tests.
- apps/ai: FastAPI chat service, provider/tool orchestration, internal authentication, tests and Dockerfile.
- prisma/schema.prisma: schema; generated Prisma client is configured under apps/web/src/generated/prisma.
- prisma/migrations: timestamped PostgreSQL migrations, including SQL constraints/triggers that Prisma schema syntax does not express.
- docs: operational and feature guides. Some existing guides disagree with current source; see §13.
- contracts: present as a reserved directory; no service contract files were found.
- package.json and package-lock.json: root npm workspace and web dependency lock.
- Top-level JavaScript such as delete_users.js, update_all.js, update_gallery.js and scratch_variants.js are ad hoc scripts, outside the documented npm workflow. Do not transfer or execute them as application modules.

### Web request and data architecture

There is no conventional controller/service/repository stack. Next.js route files are the HTTP boundary; server actions are the mutation boundary; server-rendered page modules perform read queries; business behavior is split between action modules and focused helpers under apps/web/src/lib. Most actions call Prisma directly. There is no separate repository abstraction for catalog, cart, order or account access.

The web app owns all database access. The AI service only orchestrates fixed tools by making authenticated requests back to the web app. Do not give the AI service database credentials.

## 2. Backend module map

| Responsibility | Main implementation |
| --- | --- |
| Auth.js configuration and provider | apps/web/src/auth.ts; apps/web/src/app/api/auth/[...nextauth]/route.ts |
| Current user and role checks | apps/web/src/lib/auth/authorization.ts; authorization-policy.mjs; current-user-reader.mjs |
| Password and phone identity | apps/web/src/lib/auth/password-hash.mjs; phone.mjs |
| Database client, pooling and error diagnostics | apps/web/src/lib/db/prisma.ts; database-pool-config.mjs; database-error.mjs |
| Catalog/admin mutations | apps/web/src/app/(admin)/admin/actions.ts; products/[id]/management-actions.ts; lib/admin/catalog-validation.mjs; lib/phase7/validation.mjs |
| Cart, checkout and order creation | apps/web/src/app/[locale]/(store)/actions.ts; lib/storefront/cart.ts; orders.ts; order-workflow.mjs; checkout-security.mjs; checkout-pricing.mjs |
| Order status and customer exchange actions | apps/web/src/app/(admin)/admin/orders/actions.ts; apps/web/src/app/[locale]/(store)/orders/actions.ts; lib/storefront/exchange-policy.mjs |
| Customer profile and addresses | apps/web/src/app/[locale]/account/actions.ts; lib/storefront/address-ownership.mjs |
| Store settings, content and FAQ | apps/web/src/app/(admin)/admin/settings/actions.ts; content/actions.ts |
| WhatsApp transactional outbox | apps/web/src/lib/notifications/order-events.mjs; apps/web/src/lib/whatsapp/*; apps/web/src/app/api/internal/notifications/dispatch/route.ts |
| AI bridge and ownership | apps/web/src/lib/ai/*; apps/web/src/app/api/ai/*; apps/web/src/app/api/internal/ai/tools/route.ts |
| FastAPI AI implementation | apps/ai/app/main.py; api/v1/ai.py; core/security.py; services/chat.py; tools/store_tools.py |
## 3. Database schema

### Database and migration workflow

The declared provider is PostgreSQL. Prisma schema is prisma/schema.prisma and migrations are prisma/migrations. prisma.config.ts selects DIRECT_URL first and DATABASE_URL second, loads local web env, web .env, then root .env, and points to the schema/migration directory. The web runtime uses DATABASE_URL through PrismaPg; migration commands should use DIRECT_URL where a pooler does not support DDL.

Root commands from package.json:

~~~text
npm run db:validate
npm run db:format
npm run db:generate
npm run db:migrate:dev -- --name descriptive_change
npm run db:migrate:deploy
npm run db:migrate:status
~~~

Migrations present in this checkout:

1. 20261002120000_init
2. 20261002121000_integrity_checks
3. 20261002160000_auth_identity
4. 20261002170000_phase7_store_accounts
5. 20261002190000_checkout_idempotency
6. 20261002200000_phase10_order_date_index
7. 20261003100000_phase12_notification_dispatch
8. 20261003120000_phase13_guest_chat_threads
9. 20261004100000_customer_checkout_payments
10. 20261012150000_order_item_product_image_snapshot
11. 20261013100000_phone_account_identity
12. 20261013110000_store_social_links
13. 20261013120000_product_availability
14. 20261013130000_exchange_requests

These files describe the intended schema. No live database was queried; migration status and deployed schema are unverified.

### Enum values

- Locale: AR (database label ar), EN (database label en).
- UserRole: CUSTOMER, ADMIN.
- ProductStatus: DRAFT, ACTIVE, ARCHIVED.
- ProductKind: SIMPLE, VARIANT.
- ProductAvailability: AVAILABLE, IN_TRANSIT.
- CategoryStatus: ACTIVE, ARCHIVED.
- CartStatus: ACTIVE, CONVERTED, ABANDONED.
- OrderStatus: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED.
- ExchangeRequestStatus: PENDING, APPROVED, REJECTED, COMPLETED.
- PaymentStatus: UNPAID, PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED.
- PaymentMethod: CASH_ON_DELIVERY, BANK_TRANSFER.
- NotificationStatus: PENDING, PROCESSING, SENT, FAILED.
- ChatRole: USER, ASSISTANT, SYSTEM.

The schema allows EN translations, but the storefront route allowlist and most customer flows currently support Arabic only.

### Field and relationship notation

In the data dictionary, ? means nullable, =value means Prisma default, and PK means primary key. Fields without ? are required by the Prisma model. IDs are String with Prisma cuid() defaults unless stated otherwise. Created/updated timestamps use DateTime with PostgreSQL timestamptz(3); createdAt defaults to now(), and updatedAt is maintained by Prisma. Database-specific checks and partial indexes are listed after the dictionary.

### Entity dictionary

| Entity / table | Fields and types |
| --- | --- |
| User / users | id String PK; name String?; email String?; phone String?; emailVerified DateTime?; image String?; passwordHash Text?; role UserRole = CUSTOMER; createdAt; updatedAt. |
| Account / accounts | id; userId String; type String; provider String; providerAccountId String; refresh_token Text?; access_token Text?; expires_at Int?; token_type String?; scope String?; id_token Text?; session_state String?; oauth_token_secret Text?; oauth_token Text?. Auth.js adapter model. |
| Session / sessions | id; sessionToken String; userId String; expires DateTime. Auth.js adapter model. |
| VerificationToken / verification_tokens | identifier String; token String; expires DateTime. Composite unique identifier+token; token is also unique. |
| Customer / customers | id; userId String?; name String?; email String?; phone String?; createdAt; updatedAt. Optional one-to-one User link. |
| Product / products | id; slug String; kind ProductKind = SIMPLE; status ProductStatus = DRAFT; availability ProductAvailability = AVAILABLE; shippingDurationDays Int?; featured Boolean = false; categoryId String?; seoTitle String?; seoDescription Text?; createdAt; updatedAt. |
| ProductTranslation / product_translations | id; productId String; locale Locale; name String; shortDescription Text?; description Text?; slug String; seoTitle String?; seoDescription Text?. |
| ProductSku / product_skus | id; productId String; skuCode String; price Decimal(12,2); compareAtPrice Decimal(12,2)?; stockQuantity Int = 0; isActive Boolean = true; isDefault Boolean = false; variantOptions Json?; createdAt; updatedAt. |
| ProductImage / product_images | id; productId String; url Text; providerPublicId String?; sortOrder Int = 0; altText String?; createdAt; updatedAt. Stores references/URLs, not image bytes. |
| Category / categories | id; slug String; parentId String?; status CategoryStatus = ACTIVE; sortOrder Int = 0; seoTitle String?; seoDescription Text?; createdAt; updatedAt. Self-referential parent/children tree. |
| CategoryTranslation / category_translations | id; categoryId String; locale Locale; name String; description Text?; slug String; seoTitle String?; seoDescription Text?. |
| Cart / carts | id; userId String?; customerId String?; guestTokenHash String?; status CartStatus = ACTIVE; expiresAt DateTime?; createdAt; updatedAt. Guest token is a digest, not the cookie token. |
| CartItem / cart_items | id; cartId String; skuId String; quantity Int; createdAt; updatedAt. Quantity is a positive line quantity, not a stock reservation. |
| Order / orders | id; orderNumber String; idempotencyKey String?; userId String?; customerId String?; status OrderStatus = PENDING; deliveredAt DateTime?; paymentStatus PaymentStatus = UNPAID; paymentMethod PaymentMethod = CASH_ON_DELIVERY; contactName String; contactEmail String?; contactPhone String; shippingAddress Json; currency String; subtotal Decimal(12,2); shippingCost Decimal(12,2) = 0; discountTotal Decimal(12,2) = 0; total Decimal(12,2); customerNote Text?; createdAt; updatedAt. |
| PaymentReceipt / payment_receipts | orderId String PK; mimeType String; data Bytes; createdAt. One optional receipt per order. |
| OrderItem / order_items | id; orderId String; skuId String?; productNameSnapshot String; productImageSnapshot Text?; skuCodeSnapshot String; variantSnapshot Json?; unitPrice Decimal(12,2); quantity Int; subtotal Decimal(12,2); isSaleSnapshot Boolean = false; createdAt. |
| ExchangeRequest / exchange_requests | id; orderId String; orderItemId String; userId String; requestedQuantity Int; reason Text; invoiceConfirmed Boolean; deliveryFeeAccepted Boolean; status ExchangeRequestStatus = PENDING; reviewedAt DateTime?; createdAt; updatedAt. |
| StoreSettings / store_settings | id String PK = "singleton"; storeName String?; description Text?; contactPhone String?; whatsappNumber String?; instagramUrl String?; facebookUrl String?; email String?; address Json?; shippingSettings Json?; currency String?; defaultLocale Locale = AR; isActive Boolean = true; configuration Json?; createdAt; updatedAt. JSON stores delivery zones, bank-transfer details, editorial copy and other configuration. |
| CustomerAddress / customer_addresses | id; userId String; fullName String; phone String; addressLine Text; city String; postalCode String?; notes Text?; isDefault Boolean = false; createdAt; updatedAt. |
| StoreSeoSettings / store_seo_settings | id; locale Locale; siteTitle String?; description Text?; canonicalBaseUrl String?; defaultOgImageUrl Text?; configuration Json?; createdAt; updatedAt. |
| FAQ / faqs | id; isActive Boolean = false; sortOrder Int = 0; createdAt; updatedAt. |
| FAQTranslation / faq_translations | id; faqId String; locale Locale; question String; answer Text. |
| ContentPage / content_pages | id; pageKey String; isActive Boolean = false; createdAt; updatedAt. |
| ContentPageTranslation / content_page_translations | id; contentPageId String; locale Locale; title String; slug String; body Text; seoTitle String?; seoDescription Text?. |
| NotificationOutbox / notification_outbox | id; eventKey String; eventType String; orderId String?; recipient String; payload Json; status NotificationStatus = PENDING; retryCount Int = 0; lastAttemptAt DateTime?; nextAttemptAt DateTime?; deliveryUnknown Boolean = false; errorMessage Text?; providerMessageId String?; createdAt; updatedAt. Recipient and payload may contain customer/order contact data. |
| AdminAuditLog / admin_audit_logs | id; actorUserId String?; action String; entityType String; entityId String?; metadata Json?; requestId String?; createdAt. |
| SlugRedirect / slug_redirects | id; oldSlug String; newSlug String; locale Locale; resourceType String; createdAt. No FK to the resource. |
| ChatConversation / chat_conversations | id; userId String?; customerId String?; guestTokenHash String?; metadata Json?; createdAt; updatedAt. |
| ChatMessage / chat_messages | id; conversationId String; role ChatRole; content Text; metadata Json?; createdAt. |

### Relationships, constraints, indexes and deletion behavior

- User has many Account, Session, Cart, Order, AdminAuditLog, ChatConversation, CustomerAddress and ExchangeRequest records. Its optional Customer link is one-to-one through unique Customer.userId. Deleting a User cascades accounts, sessions, addresses and exchange requests; Customer, carts, orders, audit actor and conversations use SetNull.
- Product optionally belongs to Category; deleting a category sets product.categoryId null. Product has many translations, SKUs and images. Product deletion cascades translations/images, but SKU is Restrict; application deletion code first handles dependent SKUs/order items.
- ProductTranslation belongs to Product and cascades on product deletion. Unique productId+locale and locale+slug. Product.slug is unique separately from translation slug.
- ProductSku belongs to Product with onDelete Restrict. CartItems restrict SKU deletion. OrderItems set skuId null on SKU deletion so historical snapshots can survive. SKU skuCode is globally unique. At most one default SKU per product is enforced by a partial unique index.
- ProductImage belongs to Product and cascades on deletion; indexed by productId+sortOrder. No uniqueness on sortOrder.
- Category has optional self-parent and children; deleting a parent sets child parentId null. CategoryTranslation cascades with category. Category slug is unique; translation unique categoryId+locale and locale+slug.
- Cart optionally points to User and Customer, both SetNull on deletion; CartItems cascade with cart deletion and restrict SKU deletion. guestTokenHash is unique; indexes userId+status, customerId+status, status+updatedAt.
- CartItem is unique per cartId+skuId and indexed by skuId. Cart line quantity must be positive.
- Order optionally points to User and Customer, both SetNull. OrderItem restricts order deletion; application explicitly deletes items first. Order has many notifications and exchange requests. PaymentReceipt is one-to-one and cascades when order is deleted. Orders are indexed by status+createdAt, paymentStatus+createdAt, createdAt, customerId+createdAt and userId+createdAt.
- OrderItem stores immutable purchase snapshots and optionally points to ProductSku; SKU deletion sets skuId null. It is indexed by orderId and skuId.
- ExchangeRequest belongs to Order, OrderItem and User; each relation cascades on deletion. Indexes: orderId+status+createdAt, userId+createdAt, orderItemId+status.
- StoreSettings has no relational FK and no DB constraint guaranteeing a single row; application uses id "singleton". StoreSeoSettings is unique by locale.
- FAQTranslation cascades with FAQ and is unique by faqId+locale; FAQ indexed by isActive+sortOrder. ContentPageTranslation cascades with ContentPage and is unique by contentPageId+locale and locale+slug; ContentPage.pageKey is unique.
- NotificationOutbox optionally belongs to Order; deleting order sets orderId null. eventKey is unique. Indexes: status+createdAt, status+nextAttemptAt+createdAt, status+lastAttemptAt, orderId.
- AdminAuditLog actor is optional and SetNull if user deleted. Indexes: actorUserId+createdAt, entityType+entityId+createdAt, requestId.
- SlugRedirect unique resourceType+locale+oldSlug; indexed locale+newSlug.
- ChatConversation optionally belongs to User and Customer; both SetNull. Indexes: userId+updatedAt, customerId+updatedAt, guestTokenHash+updatedAt. No DB constraint enforces exactly one owner or uniqueness for guestTokenHash in the current model.
- ChatMessage belongs to ChatConversation and cascades on deletion; indexed conversationId+createdAt.
- Account belongs to User and cascades; unique provider+providerAccountId, indexed userId. Session belongs to User and cascades; unique sessionToken, indexed userId. VerificationToken has no relation.

PostgreSQL-specific integrity from migration SQL:

- ProductSku stockQuantity >= 0, price >= 0, compareAtPrice null or >= 0.
- CartItem quantity > 0.
- Order subtotal, shippingCost, discountTotal and total >= 0.
- OrderItem unitPrice and subtotal >= 0, quantity > 0.
- NotificationOutbox retryCount >= 0.
- Category parentId cannot equal its own id. The app walks ancestors and rejects cycles when saving a category; the database does not encode a general acyclic-tree constraint.
- Product shippingDurationDays is null or 1–365.
- ExchangeRequest requestedQuantity > 0.
- CustomerAddress uses a partial unique index so each user has at most one default address.
- A deferred constraint trigger enforces exactly one default SKU for a Product whose kind is SIMPLE at transaction commit. The partial unique index enforces at most one default SKU for any product. Variant products may have no default SKU.
- No PostgreSQL row-level security policies were found in the checked-in migrations. Access control is in the server application.
### Unique keys and indexes, complete inventory

The following lists every model-declared unique key and index in the current Prisma schema. The migration SQL adds the partial indexes and checks already called out above.

| Entity | Unique constraints and indexes |
| --- | --- |
| User | Unique email; unique phone. |
| Account | Unique provider+providerAccountId; index userId. |
| Session | Unique sessionToken; index userId. |
| VerificationToken | Unique token; unique identifier+token. |
| Customer | Unique userId; indexes email and phone. |
| Product | Unique slug; indexes status+createdAt, categoryId+status, featured+status. |
| ProductTranslation | Unique productId+locale; unique locale+slug. |
| ProductSku | Unique skuCode; partial unique productId where isDefault=true; indexes productId+isActive and isActive+stockQuantity. |
| ProductImage | Index productId+sortOrder. |
| Category | Unique slug; index parentId+status+sortOrder. |
| CategoryTranslation | Unique categoryId+locale; unique locale+slug. |
| Cart | Unique guestTokenHash; indexes userId+status, customerId+status, status+updatedAt. |
| CartItem | Unique cartId+skuId; index skuId. |
| Order | Unique orderNumber; unique nullable idempotencyKey; indexes status+createdAt, paymentStatus+createdAt, createdAt, customerId+createdAt, userId+createdAt. |
| PaymentReceipt | orderId primary key (therefore unique). |
| OrderItem | Indexes orderId and skuId. |
| ExchangeRequest | Indexes orderId+status+createdAt, userId+createdAt, orderItemId+status. |
| StoreSettings | id primary key; no separate business key/index. |
| CustomerAddress | Partial unique userId where isDefault=true; index userId+createdAt. |
| StoreSeoSettings | Unique locale. |
| FAQ | Index isActive+sortOrder. |
| FAQTranslation | Unique faqId+locale. |
| ContentPage | Unique pageKey. |
| ContentPageTranslation | Unique contentPageId+locale; unique locale+slug. |
| NotificationOutbox | Unique eventKey; indexes status+createdAt, status+nextAttemptAt+createdAt, status+lastAttemptAt, orderId. |
| AdminAuditLog | Indexes actorUserId+createdAt, entityType+entityId+createdAt, requestId. |
| SlugRedirect | Unique resourceType+locale+oldSlug; index locale+newSlug. |
| ChatConversation | Indexes userId+updatedAt, customerId+updatedAt, guestTokenHash+updatedAt. |
| ChatMessage | Index conversationId+createdAt. |


## 4. Business logic and execution flows

### Authentication, authorization and accounts

- Registration: registerCustomer in apps/web/src/app/[locale]/register/actions.ts. Inputs are name, phone, addressLine, city, password, confirmation, optional next. Server validation normalizes Arabic/Persian numerals, stores a normalized unique phone, requires name/address/city and an 8–128 character password, hashes it, and creates a CUSTOMER User with Customer and default address in a nested create. Duplicate phone yields a field error. Success redirects to login. Role is never accepted from the form.
- Login: loginAction normalizes phone and validates password length, checks user role for redirect, then calls Auth.js Credentials signIn. Invalid credentials return one generic message. Auth.js performs a dummy scrypt verification for unknown/passwordless accounts to reduce obvious account-timing differences.
- Password storage: scrypt N=32768, r=8, p=1, 16-byte random salt, 64-byte output, constant-time comparison. The encoded hash includes algorithm/parameters/salt/key; plaintext is not stored.
- Sessions: Auth.js JWT strategy, maximum age 8 hours, Credentials provider. PrismaAdapter is configured and Account/Session/VerificationToken models exist, but Credentials JWT sessions are not persisted as adapter Session rows. Logout uses Auth.js signOut server actions in account/storefront/admin forms.
- Current identity: getCurrentUser reads Auth.js session subject then reloads current user id/name/phone/role from PostgreSQL. Authorization helpers do not trust submitted user IDs or role values. The roles are CUSTOMER and ADMIN. requireAdmin protects admin mutations; page guards redirect signed-out users and render not-found for non-admins.
- Customer profile edits only name. Addresses are created/updated/defaulted/deleted using authenticated user ID. Ownership is queried inside transactions. The database has one-default-per-user partial unique constraint; changing/deleting default is transactional. Registration creates a default address.
- Admin bootstrap is a manual command with temporary ADMIN_BOOTSTRAP_PHONE and ADMIN_BOOTSTRAP_PASSWORD process variables; it creates a new ADMIN only and refuses an existing phone. Admin phone update uses temporary ADMIN_ACCOUNT_PHONE and optional ADMIN_ACCOUNT_EMAIL. Neither is a seed job. Do not save these values in tracked files.

### Catalog, categories, media, prices and inventory

- Public catalog pages query directly through Prisma. Product/category pages require ACTIVE status and Arabic translation; category-bound products are hidden when category is archived. Product detail uses request-scoped React cache, not shared cross-request cache, so price/stock are refreshed per request.
- Storefront URLs include /ar, /ar/products, /ar/search, /ar/categories/[slug], /ar/products/[slug]. Query options include q, category, page and sort. The listing searches Arabic product name only with case-insensitive contains; it filters by active category slug, sorts by featured then createdAt descending, and paginates at 20 per page. The sort query is currently not applied. It does not offer SKU filters, price ranges, brand filters or availability filters.
- Product create/edit is saveProduct in admin/actions.ts, parsed by lib/admin/catalog-validation.mjs. Arabic name is required; English name is optional; slugs are generated from Arabic name on create; descriptions and SEO metadata have length checks. Price is nonnegative and up to 2 decimal places; compare-at price cannot be below current price. Availability is AVAILABLE or IN_TRANSIT; IN_TRANSIT requires shippingDurationDays 1–365. Up to eight HTTPS images are accepted. Product status is ACTIVE or DRAFT based on admin form; archive action sets ARCHIVED and deactivates its SKUs.
- Simple product has one default SKU. Product save generates a FAR-prefixed UUID SKU code; the product form-level skuCode parser value is not used by saveProduct. Variant product currently follows clothing assumptions: color/size combinations, color hex and optional color image data; each combination receives a SKU and stock. The per-SKU management action allows generic scalar JSON options (up to 12 keys), a unique SKU, price and stock. Adding a SKU converts SIMPLE to VARIANT and removes the old default marker.
- On product edit, existing variants are matched by Color+Size. An unmatched SKU still used in order history is deactivated and stock set to zero; unused SKU/cart rows can be deleted. Converting to SIMPLE updates one default SKU and removes/deactivates extras. The deferred DB trigger makes a valid simple default SKU mandatory at commit.
- Category create/update uses Arabic translation required, English optional, generated slug on create, parent-cycle validation, and explicit product assignment. A category delete is blocked while it has products or child categories. Archived categories remain in storage but hide assigned products from public listing.
- Product images can be entered as HTTPS URLs or uploaded. The implemented POST /api/admin/products/images/upload route requires same origin, ADMIN, Cloudinary credentials and a valid 4 MiB JPEG/PNG/WebP upload signature. It posts to Cloudinary and returns URL/publicId. Product image records store URL, optional Cloudinary public ID, alt text and sort order; bytes are not stored in PostgreSQL. Admin actions can reorder/make primary/delete the database record; no Cloudinary asset deletion was found, so deletion may leave an orphan in the provider.
- Product price/stock are on ProductSku, not Product. Product SKU active flag is separate from stock. Current stock is one nonnegative integer per SKU. ProductAvailability and optional shippingDurationDays are informational fulfillment labels; no purchase-order or inbound-stock ledger is present. CompareAtPrice supports a sale snapshot flag. No price history, coupon model or stock movement table exists.
- Admin inventory update locks the SKU row, sets absolute quantity, and logs old/new stock in AdminAuditLog. Low-stock threshold is read from StoreSettings.configuration key lowStockThreshold with default 10 and accepted range 1–1000.

### Cart, checkout and order lifecycle

- Cart cookie is HTTP-only, SameSite=Lax, Secure in production, with a 30-day life. A random 32-byte token is stored in the cookie; only SHA-256 digest goes into Cart.guestTokenHash. Signed-in carts are found by userId. Sign-in cart access locks the user row, links/merges guest cart, locks SKUs in sorted order, clamps merged quantity to current stock, removes unavailable zero-stock lines, and converts the old guest cart.
- Cart actions are server actions under apps/web/src/app/[locale]/(store)/actions.ts: add, update quantity, remove item, clear. Inputs use SKU/line IDs and positive integer quantity. No client price, stock or owner is accepted. Cart mutations lock cart/product/SKU rows and verify SKU active, product active, Arabic translation, active category, store-active state where applicable, and stock.
- Cart does not reserve inventory. It may become unavailable before checkout, so checkout revalidates current catalog and stock.
- Checkout page creates a signed HMAC checkout attempt token, valid for 2 hours, bound to owner, cart digest, currency, SKU IDs, quantities and current unit prices. The idempotency key is SHA-256 of the signed token. Browser stores a copy in sessionStorage for retry recovery. Server re-verifies the token and current quote; mismatched cart/prices/quantities reject the attempt. Duplicate submission with the same token returns the existing order if owner matches.
- Checkout fields: contactName (required, <=200), optional contactEmail, contactPhone, address (required, <=500), city (required, <=120), deliveryZoneName (required), paymentMethod (cash-on-delivery or bank-transfer), optional customerNote (<=2000), signed checkoutToken. For bank transfer, a receipt file is mandatory, JPEG/PNG/WebP, max 4 MiB, and checked against file magic bytes; configured bank details are also required. Client-submitted price, total, stock, user ID and customer ID are ignored.
- Delivery zones and prices are read from StoreSettings.shippingSettings.deliveryZones JSON. Checkout matches the submitted zone name to current server settings and calculates amount with decimal arithmetic. No carrier/shipping-provider API is present.
- Registered users only: on every fifth non-cancelled order (count of prior non-cancelled user orders), subtotal receives a 15% discount. Guest checkout receives no fifth-order discount. This is a project-specific loyalty rule.
- Checkout transaction locks account row if present, active cart, then sorted product and SKU rows; fetches current active sellable SKUs and validates quantity; checks signed quote and store settings; decrements each SKU with conditional updateMany where stockQuantity >= requested quantity; creates Order and OrderItem snapshots, optional PaymentReceipt, transactional WhatsApp outbox event; deletes cart items and marks cart CONVERTED. Transaction uses up to 15s wait/30s timeout (shared client wrapper applies defaults and one retry for selected transient Prisma transaction errors).
- OrderItem captures product name/image, SKU code, variant JSON, unit price, quantity, line subtotal and sale flag at purchase time. Order also snapshots contact, shipping JSON, currency and subtotal/shipping/discount/total. It remains readable if product text or SKU later changes.
- Order numbers use random bytes and a Crockford-base32-like alphabet with OF- prefix. Schema has unique orderNumber and unique nullable idempotencyKey.
- Order statuses and allowed transitions: PENDING → CONFIRMED or CANCELLED; CONFIRMED → PROCESSING or CANCELLED; PROCESSING → SHIPPED or CANCELLED; SHIPPED → DELIVERED; DELIVERED and CANCELLED are terminal in the normal admin UI. Admin status update uses conditional status update; deliveredAt is set on delivery.
- Cancellation from PENDING/CONFIRMED/PROCESSING restores SKU quantities within the same transaction, logs the transition and adds a notification event. Although changeOrderStatus contains a stock-reservation branch for reactivation, the allowed transition table makes CANCELLED terminal, so the normal admin action cannot reactivate a cancelled order. SHIPPED/DELIVERED also cannot be cancelled via normal transition. There is no refund workflow, gateway reversal or automatic payment-status adjustment on cancellation.
- Admin order deletion locks the order, refuses while its notification is PROCESSING, removes pending notifications, detaches other outbox rows, and deletes order items/order after conditional stock restoration for non-cancelled/non-shipped/non-delivered orders. Product deletion may also remove lines from active orders; see §13.
- Payment status can be set by admin to any PaymentStatus enum value using compare-and-set update and audit log; there is no transition validation or provider call. Payment methods are COD and manual bank transfer with uploaded receipt. Receipt bytes live in PostgreSQL; route only permits logged-in owner or ADMIN. Guest confirmation page displays an order by opaque public number; a guest has no account-bound receipt-download authorization path.
- Customer order history/details are scoped by session userId. Guest orders are not linked to an account. Order status history is not a separate entity/table: admin status changes are recorded as AdminAuditLog actions/metadata.

### Exchanges

A signed-in customer may request an exchange for their own delivered, non-sale order item within 12 hours after deliveredAt. It validates requested quantity <= item quantity, a reason (<=1000 characters), and invoice/fee confirmation checkboxes. One pending/approved/completed request per line is treated as active; a rejected request may be resubmitted. Admin transitions PENDING → APPROVED/REJECTED and APPROVED → COMPLETED, with reviewedAt and audit log. This is request/review tracking only: no reverse shipment, replacement order, payment adjustment or stock movement is implemented. Eligibility is checked before a transaction; the transaction locks the item and checks for another active request, but does not re-read order status/deliveredAt before creating the request. Treat that as a concurrency edge to revisit.

### Store settings, content and administration

- Admin store settings are protected and audited. StoreSettings stores name, description, contacts/social URLs, address, active flag, currency, delivery zones in shippingSettings JSON, bank-transfer data and home editorial settings in configuration JSON. Social URLs are HTTPS/domain checked. Bank transfer details are shown at checkout only when sufficient fields exist.
- Current parseStoreSettings always writes ILS and getStoreCurrency/public site data use a hardcoded storeCurrency constant (see §13). StoreSettings.currency is not used for runtime price currency. Although schema includes the field and older guides describe currency as configurable, current source does not honor configurable currency.
- FAQ and content pages use translation rows, active flags and admin actions. ContentPage.pageKey is immutable after creation; translations may be created/removed, page active toggled, and slug changes create SlugRedirect rows. There are public FAQ/policy loaders and admin pages.
- Admin dashboard, product/category management, SKU inventory, orders, settings, content/FAQ and notification outbox are rendered under /admin and protected by ADMIN page guard. Admin mutations generally create AdminAuditLog records. No fine-grained permissions beyond ADMIN were found.
- There is no standalone background queue service; WhatsApp dispatch is a protected pull endpoint invoked by a hosting scheduler.



### Notifications and AI assistant

- WhatsApp order events use NotificationOutbox. Checkout inserts ORDER_CREATED in the same transaction as the order; eligible status changes add deterministic ORDER_<STATUS>:<order-id> events in the same transaction. eventKey uniqueness prevents duplicate event rows.
- Dispatcher claims due rows in short transactions with FOR UPDATE SKIP LOCKED, sets PROCESSING and increments attempts, commits, then calls the Cloud API template endpoint. Batch default is three. Automatic retries are bounded to five attempts and used for explicit provider 429 only, with bounded Retry-After/backoff. Network errors, timeouts, 408/5xx and malformed success responses are treated as delivery-unknown and stop automatic retry. A PROCESSING row stale for 10 minutes is failed with deliveryUnknown=true.
- Admin can manually retry a FAILED row if it remains linked to an order. Retry resets the counter and audits. If delivery was unknown, a deliberate retry can send a duplicate because the provider request has no idempotency key. Outbox template payload carries customer name, order number, total and currency plus the recipient phone; it excludes address and customer note.
- No hosting scheduler is configured in the repository. A host must call GET /api/internal/notifications/dispatch with CRON_SECRET. Missing provider config leaves core checkout enabled.
- Customer chat is optional. Browser calls Next.js routes; Next.js associates a signed-in CUSTOMER or guest actor with the conversation, then sends FastAPI a short-lived signed identity token and shared bearer token. FastAPI has no database URL and calls the web internal tool route.
- AI tool allowlist: search_products, get_product, get_product_stock, get_faq, get_shipping_policy, get_return_policy, get_order_status. Tools return current public catalog/stock/policy data; order status is CUSTOMER-only and filters by both user ID and order number. Guest identity uses an HTTP-only cookie with HMAC digest stored in ChatConversation. Admin does not use customer chat.
- AI history is capped at 8 messages per request (web persistence returns last 50), assistant requests are bounded, tool calls are capped at four, request timeout is about 22 seconds in FastAPI, and the in-memory rate limiter defaults to 12 per minute per identity. These limits are process-local for rate limiting; this does not provide a distributed quota. No streaming, embeddings/vector database or direct model SQL tools were found.


## 5. API and server-action reference

This application is not primarily a REST API. Public catalog and account/order screens are server-rendered pages, and most writes use Next.js server actions. Server-action URLs/payload encoding are framework implementation details, not stable REST contracts. Forms return localized action-state objects or redirect; common shapes include {error}, {fieldErrors}, {success}, {values}, {redirectTo}. Exact action inputs and execution flow are in referenced source files.

### Web HTTP route handlers

| Method and path | Auth | Request | Success / errors and side effects |
| --- | --- | --- | --- |
| GET /api/auth/[...nextauth] | Auth.js | Auth.js provider protocol | Auth.js handler. |
| POST /api/auth/[...nextauth] | Auth.js | Credentials phone/password plus Auth.js protocol fields | Auth.js handler; Credentials sign-in establishes JWT session. No custom JSON response contract. |
| GET /api/health | Public | None | 200 JSON with service/status/readiness/checks/issues when ready; 503 when environment/database is not ready. Performs SELECT 1 and includes database diagnosis fields. Review public diagnostic detail before using as an internet-facing health endpoint. |
| GET /api/admin/db-diagnostic | ADMIN | None | 200 connected status, latency, sanitized connection location, pool config and user/product/order counts; 503 connectivity failure; 500 table-query failure; 401 unauthorized. |
| POST /api/admin/products/images/upload | Same-origin + ADMIN | multipart form field file; JPEG/PNG/WebP, 1 byte–4 MiB; Cloudinary must be configured | 200 {url,publicId}; errors use {error} with 403 origin, 401/403 auth, 503 unconfigured, 413 size, 400 invalid file, 415 type/signature, 502 provider failure. Provider stores the asset. |
| GET /api/ai/threads | Customer or guest cookie | None | 200 {threads:[{id,createdAt,updatedAt,messageCount}]}, maximum 20 returned. Sets guest cookie as needed. |
| POST /api/ai/threads | Customer or guest cookie | Empty body | 201 {thread:{id,createdAt,updatedAt}}; 403 no valid actor; 409 at thread limit (20). Creates conversation. |
| DELETE /api/ai/threads/[threadId] | Conversation owner | threadId path | 200 {ok:true}; otherwise 404 {error:"not-found"}. Deletes conversation/messages. |
| GET /api/ai/threads/[threadId]/messages | Conversation owner | threadId path | 200 {messages:[{id,role,content,createdAt}]}, latest 50 in chronological response order; 403/404 on access failure. |
| POST /api/ai/threads/[threadId]/messages | Conversation owner | JSON message string <=2000 characters; optional locale, en else defaults to ar | 200 {message:{role:"ASSISTANT",content}}; 400 invalid JSON/message; 403/404 access; 503 assistant unavailable. Calls AI first, then persists user+assistant messages in one DB transaction. |
| POST /api/internal/ai/tools | AI service bearer + signed identity token | {tool,arguments,locale}; allowlisted tool args only | 200 tool-specific public-safe data; 400 invalid request; 401 invalid service/identity; 403 order-status tool for non-customer; 503 database/tool failure. No-store. |
| GET /api/internal/notifications/dispatch | Bearer CRON_SECRET | None | 200 {status:"ok",processed,staleRecovered}; 401 unauthorized; 503 not configured/unavailable; 500 dispatcher failure. Claims up to three due outbox rows and contacts provider after claim transaction commits. |
| GET /api/orders/[orderNumber]/payment-receipt | Authenticated order owner or ADMIN | orderNumber path | Image bytes with stored JPEG/PNG/WebP content type; 401 unauthenticated; 404 missing, unsupported or not owned. Private/no-store. Guest cannot use this route. |

### FastAPI routes

| Method and path | Auth | Request and response |
| --- | --- | --- |
| GET /health/live | Public | {service:"ai",status:"ok"}. Process liveness only. |
| GET /health/ready | Public | {service,status,integrations} and missing integration names when degraded. Checks token/model/key presence, not actual provider/database connectivity. |
| POST /api/v1/ai/chat | Web service bearer plus 120-second HS256 identity token | JSON conversation_id (1–64), locale ar/en, message (1–2000), history up to 8 messages (each 1–1500, USER/ASSISTANT); returns {message} <=4000. 422 request validation, 401 invalid auth or mismatched conversation/locale, 429 per-process limiter, 503 missing config/provider/tool failure. |
| GET /docs | Development only | FastAPI interactive API documentation. Disabled outside development. |

FastAPI validation errors use {error:{code:"VALIDATION_ERROR",message,details,requestId}}; HTTP errors use a similar HTTP_ERROR object; unexpected errors return INTERNAL_ERROR without exception details. Web route handlers often return simpler {error:"..."} keys.

### Main server actions (non-REST form contracts)

| Action module | Inputs/behavior | Auth and result |
| --- | --- | --- |
| registerCustomer, loginAction | Registration profile/address/password; login phone/password and optional checkout return path | Public. Registration creates CUSTOMER and redirects to login; login returns generic localized invalid-credentials state or Auth.js sign-in redirect. |
| Store actions | add/update/remove/clear cart; checkout fields described in §4 | Cart is guest or session-owned. Checkout returns validation/action errors or redirects to order confirmation. |
| Account actions | updateProfile name; saveAddress address fields/addressId; setDefaultAddress addressId; deleteAddress addressId | CUSTOMER. Returns success/error action state; writes scoped to current user. |
| Admin catalog actions | saveProduct, saveCategory, deleteCategory, archiveProduct, deleteProduct, toggleProductStatus, updateInventory | ADMIN. Validates input, performs transactions/audit, returns action state or redirects as form requires. See catalog validation and admin/actions.ts. |
| Product management actions | saveSku, saveImage, deleteImage, makePrimaryImage, moveImage, assignImageColor | ADMIN. Product/SKU ownership is checked; mutations audited except implementations vary; image URL/SKU validation is in lib/phase7/validation.mjs. |
| Order actions | updateOrderStatusAction, updatePaymentStatusAction, updateExchangeRequestStatusAction, deleteOrderAction | ADMIN. Status transitions, restock, audit, notification, exchange state and deletion behavior are described in §4. |
| Customer exchange action | createExchangeRequestAction | Signed-in owner of order item. Request/review only. |
| Settings/content actions | changeAdminPassword, saveStoreSettings, saveContentPage, saveFaq | ADMIN. Validate, transactionally persist and audit; content page/FAQ translation management. |
| Notification retry | retryNotificationAction(notificationId) | ADMIN. Resets failed row, audits, immediately dispatches once; retry of ambiguous delivery can duplicate a provider message. |

## 6. Security and data integrity review

### Existing controls

- Passwords use salted scrypt with constant-time comparison. Unknown phone uses a dummy hash check. Auth.js errors do not log submitted credentials.
- JWT sessions require AUTH_SECRET. Authorization reloads current database role. Customer profile/address/order queries are scoped by authenticated user identity.
- Admin pages/actions use current ADMIN role. Admin bootstrap is explicit and does not modify an existing phone owner.
- Server-side validation covers catalog text/price/quantity, HTTPS image URLs, settings/social URLs, phone/account normalization, checkout fields, receipts, SKU options, order transitions and AI tool allowlist.
- Cart uses a random high-entropy HTTP-only token whose digest is stored; checkout uses a signed owner-bound quote carried in the form/sessionStorage. Cart/checkout also use row locks, conditional stock decrements and database transactions. PostgreSQL checks/trigger enforce nonnegative stock and the simple-product SKU invariant.
- Order/line pricing and product/SKU attributes are snapshotted at checkout. Checkout idempotency key is unique.
- Cloudinary image route requires same origin/admin, bounds request/file size, verifies allowed MIME type and magic bytes, and uses server-side credentials.
- AI service bearer and signed short-lived identity use HMAC-SHA256 and constant-time comparisons. Customer order tool checks both customer role and userId. Guest conversations use a random HTTP-only cookie; only HMAC digest is stored. The model receives fixed read-only tools, bounded history/output/tool count/time, and does not connect directly to PostgreSQL.
- WhatsApp cron uses constant-time bearer comparison. Outbox claim uses FOR UPDATE SKIP LOCKED, bounded retries, and avoids automatic retry when delivery may have succeeded.
- Web config adds nosniff, frame denial, restrictive base/object/frame-ancestor CSP, referrer and permissions policies; HSTS only in production. HSTS requires HTTPS at ingress.
- Database error utilities attempt to sanitize common connection passwords and raw provider messages before human-facing output.

### Gaps and risks to address in a new service

- No login/register/password-change rate limit, MFA, phone verification, account recovery, or password reset was found. Add production abuse controls.
- AI rate limiting is in-memory per process (12 requests/minute per identity by default), not distributed across instances.
- No row-level security policies were present in migrations; access control depends on keeping database credentials server-side and all queries correctly scoped.
- Auth.js uses trustHost=true. Deployment ingress/reverse proxy must validate Host headers.
- /api/health is public and currently returns database diagnosis fields including technical message/detail. Confirm those are sufficiently redacted and avoid exposing database internals in a public probe.
- Product deletion has high-impact custom logic: active orders containing that product may have line items removed and totals recomputed; an order is cancelled if no lines remain. Completed/history items are retained with skuId detached. The changed orders do not receive separate order-status history rows or normal transition notifications. This is unusual and should be redesigned or explicitly approved for the new store.
- Exchange request eligibility is not fully revalidated inside the locked transaction; no exchange fulfillment exists.
- No data retention/anonymization workflow is present for addresses, chat messages, receipts, notification recipient/payload, orders or logs.
- Payment status editing is arbitrary enum assignment; no gateway, refund, webhook, reconciliation or payment ledger exists.
- Admin diagnostic reveals database host/database name and aggregate counts to authenticated admins.
- Storefront guest confirmation access is based on an opaque order number; it displays order contact/shipping details. Keep the number unguessable and consider an owner-bound signed link for guest orders.
- Uploaded payment receipt content is stored directly in PostgreSQL; no malware scanning or external private file store was found.
- Existing CSP intentionally has no script/resource allowlist; hardening needs a nonce-aware policy.
- No inventory reservation in cart, inbound stock ledger or database stock allocation table exists. Checkout is the only decrement point.

## 7. External services

| Service | Current implementation | Required configuration |
| --- | --- | --- |
| PostgreSQL | PrismaPg through web server only | DATABASE_URL, optional DIRECT_URL for migrations; TLS/pool tuning variables below. |
| Cloudinary | Optional signed server-side image upload; existing Cloudinary URLs can receive responsive image transforms | CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. Blank config disables upload. |
| WhatsApp Cloud API | Optional template messages via outbox/cron; message content is order name/number/total/currency and recipient phone | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION, WHATSAPP_TEMPLATE_LANGUAGE_CODE, six event template names; optional WHATSAPP_DEFAULT_COUNTRY_CODE; CRON_SECRET. App does not configure a scheduler. |
| Gemini via LangChain | Optional AI chat on FastAPI; tools call authenticated Next.js endpoint | GEMINI_API_KEY, GEMINI_MODEL, AI_SERVICE_URL, AI_WEB_TOOLS_URL, shared AI_INTERNAL_SERVICE_TOKEN. |
| Shipping | No carrier/provider integration. Admin-configured delivery zones and flat prices only. | No external shipping credential. |
| Payments | COD/manual bank transfer; admin manually updates payment status | No payment processor integration. |

## 8. Environment variable reference

Names and purposes only; no values are copied. Web example: apps/web/.env.example. AI example: apps/ai/.env.example. Local populated environment files were intentionally not read.

| Variable(s) | Application / purpose |
| --- | --- |
| SITE_URL | Web canonical public origin; production requires public HTTPS. |
| DATABASE_URL | Web runtime PostgreSQL URL. |
| DIRECT_URL | Prisma migration URL; preferred over DATABASE_URL in prisma.config.ts. |
| DATABASE_SSL_MODE, DATABASE_SSL_ROOT_CERT | Optional PostgreSQL TLS mode and root CA file path; remote connections cannot use disable/prefer. |
| DATABASE_POOL_MAX | Optional bounded pool size, 1–20. Current code defaults to 1 in Vercel/AWS Lambda and 10 elsewhere. |
| DATABASE_CONNECTION_TIMEOUT_MS, DATABASE_IDLE_TIMEOUT_MS, DATABASE_QUERY_TIMEOUT_MS | Optional bounded pool wait, idle and query timeouts. |
| AUTH_SECRET | Auth.js and signed checkout/guest-related functionality; minimum 32 characters in readiness/configuration. |
| CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET | Optional admin image upload. |
| WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION, WHATSAPP_TEMPLATE_LANGUAGE_CODE | WhatsApp provider credentials/version/language. |
| WHATSAPP_TEMPLATE_ORDER_CREATED, WHATSAPP_TEMPLATE_ORDER_CONFIRMED, WHATSAPP_TEMPLATE_ORDER_PROCESSING, WHATSAPP_TEMPLATE_ORDER_SHIPPED, WHATSAPP_TEMPLATE_ORDER_DELIVERED, WHATSAPP_TEMPLATE_ORDER_CANCELLED | Approved event template names. |
| WHATSAPP_DEFAULT_COUNTRY_CODE | Optional digits-only prefix for national phone numbers; no country is assumed otherwise. |
| CRON_SECRET | Bearer secret for notification dispatch; at least 32 characters. |
| AI_SERVICE_URL | Web server's FastAPI base URL. |
| AI_INTERNAL_SERVICE_TOKEN | Shared server-to-server secret in web and AI apps; at least 32 characters; never browser-visible. |
| AI_ENVIRONMENT, AI_SERVICE_NAME, AI_HOST, AI_PORT, AI_CORS_ORIGINS, AI_WEB_TOOLS_URL | FastAPI runtime settings (AI_ prefix); keep browser CORS origins empty for server-to-server design. |
| GEMINI_API_KEY, GEMINI_MODEL | AI provider credential and model name, server side only. |
| ADMIN_BOOTSTRAP_PHONE, ADMIN_BOOTSTRAP_PASSWORD | Temporary process-only values for explicit one-time first-admin creation; not runtime config, never persistent env-file values. |
| ADMIN_ACCOUNT_PHONE, ADMIN_ACCOUNT_EMAIL | Temporary process-only values for explicit admin phone update; not runtime config. |
| PORT | Platform-provided AI container port; Docker command falls back to AI_PORT locally. |
| NODE_ENV, VERCEL, AWS_LAMBDA_FUNCTION_NAME | Platform/runtime flags used for production security headers, cookies, pool defaults and environment validation. |

## 9. Build, development and verification commands

These commands are present in README/package scripts; they were not run as part of this read-only analysis.

~~~text
npm ci
npm run dev:web
npm run lint:web
npm run typecheck:web
npm run build:web
npm run validate:web
npm run start:web
npm run db:validate
npm run db:format
npm run db:generate
npm run db:migrate:dev -- --name descriptive_change
npm run db:migrate:deploy
npm run db:migrate:status
~~~

AI local run and checks:

~~~text
python -m pip install -r apps/ai/requirements-dev.txt
python -m uvicorn app.main:app --reload --app-dir apps/ai
python -m compileall -q apps/ai/app
python -m pytest -c apps/ai/pyproject.toml apps/ai/tests
~~~

Web test scripts are npm run test:auth, test:admin, test:orders, test:cart, test:checkout, test:phase7, test:phase10, test:phase11, test:phase12, test:phase13, test:phase14, test:phase15, test:phase16 and test:deployment.

Vercel config sets root install to npm ci and build to npm run db:generate && npm run build. AI Dockerfile uses python:3.12-slim, installs apps/ai/requirements.txt, runs as a non-root user, and starts Uvicorn. README describes Vercel/Render-style deployment, but no active deployment/provider configuration was verified in this task.

## 10. Feature status matrix

| Feature | Status | Evidence / boundary |
| --- | --- | --- |
| Phone/password registration/login/logout | Implemented | Auth.js credentials and server actions; no recovery or rate limiting. |
| Admin role protection | Implemented | Protected layout, page guard and action guard. |
| Product/category CRUD and publishing | Implemented | Admin actions and validation; hard delete carries order side effects. |
| Product images | Implemented with optional Cloudinary | URL record management and upload route, only if credentials configured. |
| SKU variants and stock | Implemented | SKU model, variant form and generic JSON option action; Color/Size form is clothing-specific. |
| Search/filter/pagination | Partial | Arabic name contains, category, page size 20. sort parameter ignored. |
| Cart | Implemented | Guest/session carts, merge and stock revalidation; no reservation. |
| Checkout/order creation | Implemented | Signed quote, idempotency, delivery zones, snapshots, conditional stock deduction. |
| Payments | Partial/manual | COD and bank transfer receipt; manual admin status changes; no gateway/refunds. |
| Shipping | Partial/manual | Configured delivery zones and flat price; no carrier API, shipping label or tracking integration. |
| Order lifecycle/cancellation/restock | Implemented | Limited transition graph, cancellation restocks; no refund. |
| Exchange requests | Partial | 12-hour request/review state machine; no replacement/refund/logistics. |
| Order history | Implemented for accounts | User-scoped; guest confirmation only by order number. |
| Admin audit | Partial | Admin mutation audit log; not a complete event-sourcing or order-history ledger. |
| Store settings/content/FAQ/SEO | Implemented | Settings/config JSON, translated content, active flags, slug redirects. Currency behavior diverges from older docs. |
| WhatsApp | Optional implemented integration | Transactional outbox, provider, bounded dispatcher; requires credentials/templates/scheduler. |
| AI assistant | Optional implemented integration | FastAPI/Gemini, allowlisted tools; no DB in AI service; requires tokens/model. |
| Background jobs | Missing as worker service | Dispatcher is invoked through protected HTTP endpoint and external scheduler. |
| RLS | Not found | Application-level authorization only. |

## 11. Existing tests

Web unit/contract suites: apps/web/tests/auth-foundation.test.mjs, admin-foundation.test.mjs, cart-workflow.test.mjs, checkout-security.test.mjs, database-error-diagnosis.test.mjs, deployment-config.test.mjs, order-workflow.test.mjs, phase7-validation.test.mjs, phase10-orders-inventory.test.mjs, phase11-admin-dashboard.test.mjs, phase12-whatsapp.test.mjs, phase13-ai.test.mjs, phase14-seo.test.mjs, phase15-performance.test.mjs, and phase16-security.test.mjs.

AI service pytest suites: apps/ai/tests/test_ai_security.py, test_ai_tools.py, and test_health.py.

The checked-in web suites mostly exercise pure workflow helpers, validation, authorization contracts, mocked notification behavior, and static config. The AI suites exercise FastAPI route/security/tool behavior with test clients/mocks. They do not establish live PostgreSQL migration, concurrency, provider delivery or production readiness. No tests were run for this document task.

## 12. Known uncertainty

- No live PostgreSQL database was queried; production schema and migration status could differ from these files.
- Local .env.local and apps/ai/.env were not read. Runtime values and whether optional integrations are configured are unknown.
- No Cloudinary, WhatsApp, Gemini, Vercel or Render provider connectivity was checked.
- No build, typecheck, migration, test, upload, order or external dispatch was executed.
- The checkout contains unrelated pre-existing working-tree modifications. This documentation does not describe or change them.

## 13. Source/documentation drift and adaptation notes

Treat current application source and migrations as the source of truth. Existing repository guides contain statements that conflict with checked-in implementation:

1. Currency: phase7/validation.mjs hardcodes storeCurrency to ILS; settings parser writes that value; public store data and order helpers use the constant. StoreSettings.currency is not used for runtime price currency. Prior docs describe it as configurable and supportedCurrencies lists multiple currencies. Design a real per-store currency strategy before reuse.
2. Cloudinary: current admin upload route consumes CLOUDINARY_* and uploads images when configured. Older environment/deployment/store-account guides say no upload provider is used. Keep the source implementation fact and verify credentials/deployment separately.
3. Pool size: database-pool-config.mjs defaults pool max to 1 on serverless, 10 elsewhere. One existing deployment guide says 5 elsewhere.
4. Localization/brand: current UI/routes are Arabic-first and fixed to /ar despite Locale also containing EN; code contains Organza, Farasha and gift-store names/identifiers. Remove/replace brand, slug, locale and domain assumptions for the new store.
5. A static typing concern was noticed during inspection: the order-confirmation page refers to Metadata without an apparent type import. No typecheck/build was run, so verify this before using the checkout as a clean build baseline.
6. Product deletion behavior and fifth-order 15% discount are business policies, not generic catalog/order primitives. Decide whether they fit the skincare/fragrance business rather than transplanting them silently.

