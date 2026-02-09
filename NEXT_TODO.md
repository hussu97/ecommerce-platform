# Next Potential Todo Tasks

A prioritized list of features, architecture improvements, and e-commerce enhancements.  
**Status:** ✅ Implemented | 🔶 Partial | ⬜ Not started

---

## 1. E-commerce Features (Customer-Facing)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **Wishlist / Saved Items** | Let users save products for later; sync across devices when logged in. New model `WishlistItem`, API endpoints, UI in customer-web and shop. | Medium |
| 🔶 | **Product Search** | Full-text search (name, description, brand). *Current:* simple name ILIKE in `/products`. Add FTS5 or Elasticsearch/Meilisearch for scale. | Medium |
| 🔶 | **Order Tracking** | Real-time status updates. *Current:* admin can set order/item status (shipped, delivered); customer sees status. Missing: tracking number field, carrier API, customer notifications. | Medium |
| ⬜ | **Promotions / Discounts** | Coupon codes, percentage/fixed discounts, BOGO. New models: `Promotion`, `Coupon`. Apply at checkout. | Medium–High |
| ⬜ | **Returns & Refunds** | Return request flow, refund via Stripe, restocking. Admin approval and status tracking. | High |
| ⬜ | **Low Stock Alerts** | Notify users when out-of-stock items are back. Requires email/push setup and background jobs. | Medium |
| ⬜ | **Recently Viewed** | Store last N viewed products (localStorage or backend). Simple product suggestions. | Low |
| ⬜ | **Related Products** | "You may also like" based on category, brand, or purchase history. | Low–Medium |
| ⬜ | **Order History Export** | Allow users to download order history as CSV/PDF. | Low |
| ⬜ | **Email Notifications** | Order confirmation, shipping updates, password reset. Requires email service (SendGrid, SES, etc.). | Medium |

---

## 2. E-commerce Features (Admin)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| 🔶 | **Dashboard Analytics** | Sales overview, top products, revenue trends. *Current:* basic dashboard with order count and product count. Add charts (e.g. Recharts), revenue by period, top products. | Medium |
| ⬜ | **Inventory Alerts** | Admin notification when stock falls below threshold. Low-stock report. | Low |
| 🔶 | **Bulk Operations** | Bulk edit products (price, category, stock), bulk export (CSV). *Current:* bulk import (template, upload, worker) and BulkUploadsPage are done. | Medium |
| ⬜ | **Promotions CRUD** | Admin UI to create and manage coupons and promotions. | Medium |
| ⬜ | **Customer Management** | List customers, view order history, impersonate or support actions. | Medium |
| 🔶 | **Order Fulfillment Flow** | Mark as shipped, add tracking number, trigger customer notification. *Current:* status update and stock release on shipped; no tracking number, no notification. | Medium |
| ⬜ | **Reporting** | Sales by period, category, brand; export reports. | Medium |

---

## 3. System Architecture Enhancements

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **Database Migrations** | Replace `reset_and_seed`-only approach with Alembic migrations for incremental schema changes. | Medium |
| ⬜ | **Caching** | Redis for product list, session, or i18n strings. Reduce DB load and latency. (Redis in Docker profile exists; no app usage yet.) | Medium |
| 🔶 | **Background Jobs** | Celery or ARQ for async tasks (emails, stock sync, report generation). *Current:* bulk-import worker only. | Medium–High |
| ⬜ | **Rate Limiting** | Throttle auth, checkout, and public endpoints to prevent abuse. | Low |
| ⬜ | **Feature Flags** | Toggle features (promotions, wishlist) without deploys. | Medium |
| ⬜ | **Event-Driven Updates** | Publish order/stock events; consumers for notifications, analytics. | High |
| ⬜ | **Read Replicas** | Split read/write for product catalog when traffic grows. | High |

---

## 4. Security & Compliance

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **GDPR / Privacy** | Data export, right to deletion, cookie consent, privacy policy. | Medium |

---

## 5. UX & Frontend

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ✅ | **Skeleton Loading** | Replace spinners with skeletons for product cards and PDP. | — |
| ⬜ | **Image Optimization** | Lazy loading, responsive images, Next.js Image, CDN. | Low–Medium |
| ⬜ | **Offline Support (Shop)** | Cache product list/cart for limited offline use (e.g. via AsyncStorage). | Medium |
| ⬜ | **Push Notifications (Shop)** | Order and promotion notifications via Expo Push. | Medium |
| 🔶 | **Accessibility (a11y)** | ARIA labels, keyboard nav, focus management, screen reader support. *Current:* minimal aria/role/alt usage. | Medium |
| 🔶 | **Error Boundaries** | Graceful error UI instead of blank screens. *Current:* Shop has ErrorBoundary in root layout; customer-web and admin-web do not. | Low |
| ⬜ | **Analytics** | Track key events (add to cart, checkout start, purchase) for optimization. | Low–Medium |

---

## 6. DevOps & Deployment

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **PostgreSQL Migration** | Move from SQLite to PostgreSQL for production (see PRODUCTION.md). | Medium |
| ✅ | **Docker Compose** | Local dev with all services (APIs, DB, bulk-import worker, init, customer-web, admin-web) in containers. | — |
| ⬜ | **CI/CD** | GitHub Actions for lint, test, build; deploy to Render/Vercel. | Medium |
| ⬜ | **E2E Tests** | Playwright or Cypress for critical flows (checkout, login). | Medium |
| ⬜ | **Environment Parity** | Staging env that mirrors production for testing. | Low–Medium |

---

## 7. Additional Features (Expanded)

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **Product Compare** | Let users compare up to N products (specs, price) side by side. | Low–Medium |
| ⬜ | **Guest Checkout** | Complete checkout without account; optional “create account after” with order link. | Medium |
| ⬜ | **Multiple Currencies** | Display and optionally charge in multiple currencies; exchange rates. | Medium–High |
| ⬜ | **Product Q&A / Reviews Moderation** | Admin queue to approve or reject reviews; optional Q&A on PDP. | Low–Medium |
| ⬜ | **Saved Carts** | Persist cart for logged-in users across devices; “cart last updated” hint. | Low |
| ⬜ | **Subscription / Recurring** | Subscribe-and-save or recurring orders for specific products. | High |

---

## 8. Optimizations

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **API Response Compression** | Gzip/Brotli for JSON responses. | Low |
| ⬜ | **Query & N+1 Reduction** | Eager load relations in product list, order detail; avoid N+1 in filters. | Low–Medium |
| ⬜ | **Frontend Bundle & Code Splitting** | Analyze bundle size; lazy-load routes and heavy components (admin-web, customer-web, shop). | Low–Medium |
| ⬜ | **DB Indexing Review** | Indexes on slug, status, created_at, and filter columns used in list endpoints. | Low |
| ⬜ | **Static Asset CDN** | Serve product images and static assets via CDN with cache headers. | Low–Medium |

---

## 9. Scalability & Reliability

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ✅ | **Idempotency for Orders / Payment** | Idempotency keys for order creation and payment intent to avoid duplicates on retry. | Medium |
| ⬜ | **Health & Readiness Probes** | Differentiate liveness vs readiness (e.g. DB connectivity); use in Docker/Kubernetes. | Low |
| ✅ | **Structured Retries** | Retry with backoff for DB and external calls (e.g. payment, email). | Low–Medium |
| ✅ | **Request Timeouts** | Consistent timeouts on outbound HTTP and DB calls. | Low |
| ⬜ | **Circuit Breaker (Optional)** | For external services (payment, email) to fail fast when unhealthy. | Medium |

---

## 10. Security Hardening

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **CSRF / Same-Site** | Ensure state-changing operations use CSRF tokens or SameSite cookies where applicable. | Low–Medium |
| ⬜ | **Input Sanitization** | Sanitize rich text or user-generated content to prevent XSS. | Low |
| ⬜ | **Secrets Rotation** | Document and support rotation of JWT secret, DB credentials, API keys. | Low |
| ⬜ | **Audit Log Retention** | Policy and tooling for audit log retention and secure access. | Low |
| ⬜ | **Dependency Scanning** | Dependabot or similar; npm/pip audit in CI. | Low |

---

## 11. Design System & UI/UX

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ✅ | **Design Tokens as Single Source** | Export tokens (colors, spacing, typography) from one place; consume in customer-web, admin-web, shop. | — |
| ⬜ | **Dark Mode** | Full dark theme across customer-web and shop (and optionally admin-web). | Medium |
| ⬜ | **Mobile-First Admin** | Responsive or dedicated mobile view for admin (orders, approve, basic actions). | Medium |
| ⬜ | **Empty & Error States** | Consistent empty-state and error-state illustrations/copy across apps. | Low |
| ✅ | **Loading & Transition Consistency** | Unified loading indicators and page transitions (e.g. skeleton vs spinner rules). | — |

---

## 12. Architectural

| Status | Task | Description | Effort |
|--------|------|-------------|--------|
| ⬜ | **API Gateway / BFF** | Optional API gateway or BFF layer for auth, aggregation, rate limiting. | High |
| ⬜ | **Structured Logging & Tracing** | Request IDs across services; optional OpenTelemetry for traces. | Medium |
| ⬜ | **Config Service** | Centralized config (feature flags, limits) without code deploy. | Medium |
| ⬜ | **Service Boundaries Doc** | Clear ownership: customer-api vs admin-api; shared DB contract and evolution. | Low |

---

## Suggested Priority Order

1. **Quick wins:** Recently viewed, low-stock admin alerts, health/readiness refinement, rate limiting, error boundaries (customer-web, admin-web).
2. **High impact:** Wishlist, promotions, email notifications, dashboard analytics, tracking number + fulfillment UX.
3. **Foundation:** Database migrations, caching, background jobs, idempotency for orders.
4. **Scale:** Full-text search (FTS5 or Elasticsearch/Meilisearch), event-driven design.
5. **Polish:** Returns/refunds, push notifications, a11y, analytics, design tokens, dark mode.

---

## Changelog (Implemented)

| Date | Change |
|------|--------|
| 2025-02-09 | **Idempotency, retries, timeouts:** Idempotency keys for orders and payment intents (table, header); Stripe retries with tenacity; DB and Stripe timeouts; frontend axios 30s. |
| 2025-02-09 | **Loading and transition consistency:** PageLoader, ProductCardSkeleton, PdpSkeleton (customer-web); TableSkeleton, PageLoader (admin-web); FullScreenLoader, ProductCardSkeleton (shop). Skeleton for product grid, PDP, tables; spinner for full-page/inline. Button/card transitions (active:scale, duration-500). DESIGN_TEMPLATE.md and rules updated. |
| 2025-02-09 | **Design tokens single source:** Added `packages/design-tokens` with `tokens.json`, codegen for `dist/theme.css`, and JS export. Root npm workspaces; customer-web and admin-web import theme CSS; shop uses package in `constants/Colors.ts`. Rule added: token changes only in `packages/design-tokens`. |
| 2025-02-09 | **NEXT_TODO audit:** Added implementation status (✅/🔶/⬜) to all existing items. Classified: Product Search (partial – name ILIKE), Order Tracking (partial – status only), Dashboard (partial – counts only), Bulk Ops (partial – import done), Order Fulfillment (partial – status + stock), Background Jobs (partial – bulk worker), a11y (partial), Error Boundaries (partial – Shop only), Docker Compose (done). Expanded list with new sections: Additional Features, Optimizations, Scalability & Reliability, Security Hardening, Design System & UI/UX, Architectural. |
| 2025-02-09 | **Plan verification:** Added audit_log to reset_and_seed imports for table creation; added phone pattern to AddressCreate/AddressUpdate; created .env.example for customer-web and shop with API URL vars. Frontends (customer-web, shop, admin-web) verified: baseURL and proxy/rewrite point to /v1. |
| 2025-02-08 | **Security & Infrastructure:** HTTPS redirect, security headers, input validation (Pydantic Field constraints), audit logging (admin + customer actions), API versioning (/v1 prefix), structured logging (structlog, request ID), health checks with DB connectivity. Removed from todo list above. |

*Last updated: 2025-02-09*
