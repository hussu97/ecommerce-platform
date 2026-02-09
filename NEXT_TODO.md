# Next Potential Todo Tasks

A prioritized list of features, architecture improvements, and e-commerce enhancements to consider for the platform.

---

## 1. E-commerce Features (Customer-Facing)

| Task | Description | Effort |
|------|-------------|--------|
| **Wishlist / Saved Items** | Let users save products for later; sync across devices when logged in. New model `WishlistItem`, API endpoints, UI in customer-web and shop. | Medium |
| **Product Search** | Full-text search (name, description, brand). Start with SQLite FTS5; later migrate to Elasticsearch/Meilisearch for scale. | Medium |
| **Order Tracking** | Real-time status updates (e.g. shipped, out for delivery). Integrate with carrier APIs or manual status updates from admin. | Medium |
| **Promotions / Discounts** | Coupon codes, percentage/fixed discounts, BOGO. New models: `Promotion`, `Coupon`. Apply at checkout. | Medium–High |
| **Returns & Refunds** | Return request flow, refund via Stripe, restocking. Admin approval and status tracking. | High |
| **Low Stock Alerts** | Notify users when out-of-stock items are back. Requires email/push setup and background jobs. | Medium |
| **Recently Viewed** | Store last N viewed products (localStorage or backend). Simple product suggestions. | Low |
| **Related Products** | "You may also like" based on category, brand, or purchase history. | Low–Medium |
| **Order History Export** | Allow users to download order history as CSV/PDF. | Low |
| **Email Notifications** | Order confirmation, shipping updates, password reset. Requires email service (SendGrid, SES, etc.). | Medium |

---

## 2. E-commerce Features (Admin)

| Task | Description | Effort |
|------|-------------|--------|
| **Dashboard Analytics** | Sales overview, top products, revenue trends. Charts (e.g. Recharts) with aggregated order data. | Medium |
| **Inventory Alerts** | Admin notification when stock falls below threshold. Low-stock report. | Low |
| **Bulk Operations** | Bulk edit products (price, category, stock), bulk import/export (CSV). | Medium |
| **Promotions CRUD** | Admin UI to create and manage coupons and promotions. | Medium |
| **Customer Management** | List customers, view order history, impersonate or support actions. | Medium |
| **Order Fulfillment Flow** | Mark as shipped, add tracking number, trigger customer notification. | Medium |
| **Reporting** | Sales by period, category, brand; export reports. | Medium |

---

## 3. System Architecture Enhancements

| Task | Description | Effort |
|------|-------------|--------|
| **Database Migrations** | Replace `reset_and_seed`-only approach with Alembic migrations for incremental schema changes. | Medium |
| **Caching** | Redis for product list, session, or i18n strings. Reduce DB load and latency. | Medium |
| **Background Jobs** | Celery or ARQ for async tasks (emails, stock sync, report generation). | Medium–High |
| **Rate Limiting** | Throttle auth, checkout, and public endpoints to prevent abuse. | Low |
| **Feature Flags** | Toggle features (promotions, wishlist) without deploys. | Medium |
| **Event-Driven Updates** | Publish order/stock events; consumers for notifications, analytics. | High |
| **Read Replicas** | Split read/write for product catalog when traffic grows. | High |

---

## 4. Security & Compliance

| Task | Description | Effort |
|------|-------------|--------|
| **GDPR / Privacy** | Data export, right to deletion, cookie consent, privacy policy. | Medium |

---

## 5. UX & Frontend

| Task | Description | Effort |
|------|-------------|--------|
| **Skeleton Loading** | Replace spinners with skeletons for product cards and PDP. | Low |
| **Image Optimization** | Lazy loading, responsive images, Next.js Image, CDN. | Low–Medium |
| **Offline Support (Shop)** | Cache product list/cart for limited offline use (e.g. via AsyncStorage). | Medium |
| **Push Notifications (Shop)** | Order and promotion notifications via Expo Push. | Medium |
| **Accessibility (a11y)** | ARIA labels, keyboard nav, focus management, screen reader support. | Medium |
| **Error Boundaries** | Graceful error UI instead of blank screens. | Low |
| **Analytics** | Track key events (add to cart, checkout start, purchase) for optimization. | Low–Medium |

---

## 6. DevOps & Deployment

| Task | Description | Effort |
|------|-------------|--------|
| **PostgreSQL Migration** | Move from SQLite to PostgreSQL for production (see PRODUCTION.md). | Medium |
| **Docker Compose** | Local dev with all services (APIs, DB, Redis) in containers. | Medium |
| **CI/CD** | GitHub Actions for lint, test, build; deploy to Render/Vercel. | Medium |
| **E2E Tests** | Playwright or Cypress for critical flows (checkout, login). | Medium |
| **Environment Parity** | Staging env that mirrors production for testing. | Low–Medium |

---

## Suggested Priority Order

1. **Quick wins:** Recently viewed, low-stock admin alerts, health checks, rate limiting.
2. **High impact:** Wishlist, promotions, email notifications, dashboard analytics.
3. **Foundation:** Database migrations, caching, background jobs.
4. **Scale:** Full-text search (Elasticsearch/Meilisearch), event-driven design.
5. **Polish:** Returns/refunds, push notifications, a11y, analytics.

---

---

## Changelog (Implemented)

| Date | Change |
|------|--------|
| 2025-02-09 | **Plan verification:** Added audit_log to reset_and_seed imports for table creation; added phone pattern to AddressCreate/AddressUpdate; created .env.example for customer-web and shop with API URL vars. Frontends (customer-web, shop, admin-web) verified: baseURL and proxy/rewrite point to /v1. |
| 2025-02-08 | **Security & Infrastructure:** HTTPS redirect, security headers, input validation (Pydantic Field constraints), audit logging (admin + customer actions), API versioning (/v1 prefix), structured logging (structlog, request ID), health checks with DB connectivity. Removed from todo list above. |

*Last updated: 2025-02-09*
