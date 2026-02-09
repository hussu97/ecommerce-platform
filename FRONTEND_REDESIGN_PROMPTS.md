# Frontend Redesign – Run These Prompts One by One

Use `@ecommerce-platform/design_template.html` as the design reference whenever the design is unclear. Design tokens: **primary `#ec9213`**, **background-light `#f8f7f6`**, **background-dark `#221a10`**, **sand divider `#e5e1da`**, **text muted `#897961`**, **Noto Serif** (headings), **Noto Sans** (body).

**Status:** ✅ 1 Filters overlay · ✅ 2 Desktop layout · ✅ 3 Translations · ✅ 4 Shop app (design system) · ✅ 5 Admin (design system) · ✅ 6 Order/Login/Orders screens  

**Shop app:** Use the step-by-step prompts in **`SHOP_APP_UI_PROMPTS.md`** for filters modal, product card, cart, PDP, and design consistency.

---

## 1. Customer-Web: Add Filters Overlay (Sort, Category, Price, Brand, Attributes) ✅ Done

**Goal:** Add a Filters UI that matches the design in `design_template.html` (the “Filters” full-screen overlay: Sort By, Category, Price Range, Brand, Material).

**Tasks:**
- Add a “Filters” button or link on the home/product listing (e.g. next to category chips or in the header) that opens a filters overlay (modal or full-screen drawer).
- Build the overlay to match the template:
  - Header: “Filters” title, Close, “Reset”.
  - Sections: **Sort By** (Featured, Newest, Price: Low to High, Price: High to Low) as pill buttons; **Category** (grid of categories, “All Categories” with check); **Price Range** (min/max inputs or range slider, labels “Min (AED)” / “Max (AED)”); **Brand** (pill buttons, “See All”); **Material** (or other attributes: horizontal scroll of color/material chips).
- Wire filters to the existing products API (e.g. `category_slug`, `brand_slug`, `sort`, `min_price`, `max_price`, `option_ids` or attribute params). When the user clicks “Show Products” or “Apply”, close the overlay and refetch the product list with the selected filters.
- Use design tokens: primary for selected state, sand borders, serif section titles, rounded-full pills, `no-scrollbar` for horizontal lists.

**Reference:** Second screen in `design_template.html` (Filters overlay).

---

## 2. Customer-Web: Desktop Layout (Stop Looking Like a Mobile-Only App)

**Goal:** On desktop, the customer-web app should feel like a proper website, not a 430px mobile app stretched or centered.

**Tasks:**
- Remove or relax the strict `max-w-[430px]` on desktop (e.g. use it only for small viewports; on `md:` and up use a wider max-width, e.g. `max-w-6xl` or `max-w-7xl`).
- Home: on desktop, use a multi-column product grid (e.g. 3–4 columns), wider hero, category chips in a row or wrapped grid, search bar with comfortable max-width.
- Product listing: same—wider grid, optional sidebar for filters (desktop) while keeping the filters overlay for mobile.
- PDP: on desktop, use a two-column layout (image left, details right) instead of a single stacked column.
- Cart / Checkout: on desktop, use a two-column layout (e.g. form/summary side by side) and avoid a single narrow column.
- Navbar/header: on desktop, show a horizontal nav (e.g. logo, nav links, search, cart, account) instead of the mobile-only greeting strip.
- Footer: already present; ensure it spans full width on desktop and matches the design system.
- Use responsive Tailwind breakpoints (`sm:`, `md:`, `lg:`) and avoid a single mobile-first width for all screens.

**Reference:** Same design tokens and components as in `design_template.html`, but adapted for wider viewports.

---

## 3. Customer-Web: Fill Missing Translations

**Goal:** Ensure all user-facing strings use the i18n store and that default (fallback) translations exist for every key used in the app.

**Tasks:**
- Audit all `t("...")` and similar calls in customer-web. Add any missing keys to `DEFAULT_STRINGS` in `stores/useI18nStore.ts`. Include at least: `product`, `reviews`, `description`, `complimentary_delivery`, `shop_now`, `view_all`, `filters`, `sort_by`, `featured`, `newest`, `price_low_to_high`, `price_high_to_low`, `category`, `all_categories`, `price_range`, `min_aed`, `max_aed`, `brand`, `see_all`, `show_products`, `reset`, `assalamu_alaikum`, `welcome_subtitle` (e.g. “Welcome to your sanctuary”), `shopping_bag`, `proceed_to_checkout`, `order_summary`, `subtotal`, `shipping`, `total`, `delivery_address`, `shipping_method`, `payment`, `place_order`, `add_to_sanctuary`, `secure_checkout`, `order_confirmed`, `thank_you_order`, `back_to_home`, `my_orders`, `track_order`, `login`, `sign_up`, `forgot_password`, `email`, `password`, and any other keys used in cart, checkout, orders, login, signup, profile.
- Replace any hardcoded English strings in components/pages with `t("key")` and add the key to defaults (and to backend/translations if applicable).
- Ensure design-specific copy (e.g. “Assalamu Alaikum”, “Add to Sanctuary”, “Curated for You”) is either in the design tokens/docs or in translation keys so they can be localized.

**Reference:** `customer-web/stores/useI18nStore.ts` and all pages/components that render text.

---

## 4. Shop App (React Native / Expo): Apply Design System

**Goal:** Make the shop app (Expo) visually match the design in `design_template.html`: same colors, typography, and component style.

**Tasks:**
- Update `constants/Colors.ts`: set primary to `#ec9213`, background light to `#f8f7f6`, background dark to `#221a10`; add sand divider `#e5e1da`, text muted `#897961`. Ensure light/dark theme use these values.
- Load **Noto Serif** and **Noto Sans** (or fallback to system serif/sans). Apply Serif for headings (e.g. screen titles, product names) and Sans for body and UI.
- Home (`app/(tabs)/index.tsx`): greeting “Assalamu Alaikum” + “Welcome to your sanctuary”, search bar with rounded container and icon, category chips (primary when selected), hero section, “Curated for You” product grid with 4:5 aspect cards, primary price and serif product names.
- Product card: match template (image 4:5, favorite icon, serif title, muted category, primary price).
- PDP, Cart, Checkout, Login, Orders: use same tokens (primary buttons, rounded corners, serif/sans, sand/muted colors). Reuse layout ideas from the HTML template (e.g. PDP image + details, cart card layout, checkout steps).
- Tab bar: style with primary for selected state, matching the “Bottom Navigation” in the template.
- Ensure all new or updated screens use the design system; remove or replace old generic styling (e.g. old primary #232f3e).

**Reference:** `design_template.html` (all screens), `shop/constants/Colors.ts`, `shop/app/` and `shop/components/`.

---

## 5. Admin-Web: Apply Design System

**Goal:** Apply the same design language to the admin app (Vite/React): primary `#ec9213`, Noto Serif/Noto Sans, sand/muted palette, rounded buttons and cards.

**Tasks:**
- Add design tokens to admin-web: CSS variables or Tailwind config for primary, background-light, background-dark, sand-divider, text-muted; import Noto Serif and Noto Sans (e.g. Google Fonts).
- Update `index.css` and any global styles: body font Noto Sans, heading font Noto Serif, default colors from tokens.
- Layout/sidebar: use background-light and sand borders; primary for active nav item and buttons.
- Dashboard, Products, Orders, Brands, Login: primary buttons, serif page titles, cards with rounded corners and sand borders, tables or lists with consistent typography and spacing.
- Keep admin-specific UX (tables, forms, filters) but restyle to match the new tokens (no need to copy mobile layout; desktop-first is fine).

**Reference:** `design_template.html` (colors and typography only; layout is admin-style), `admin-web/src/`.

---

## 6. Customer-Web: Order Confirmation, Login, Signup, My Orders, Order Details

**Goal:** Ensure these screens match the design template and use the design system.

**Tasks:**
- **Order success** (`app/orders/success/page.tsx`): “Shukran” / thank-you message, primary checkmark icon, order number and expected delivery, order summary and delivery address, “Back to Home” primary button. Match the “Order Status” screen in the template.
- **Login** (`app/login/page.tsx`): “Assalamu Alaikum”, Login/Sign Up tabs, email/password inputs (rounded, sand border), “Forgot Password?”, primary “Continue” button, “Or continue with” + Google/Apple. Match the Account Access screen in the template.
- **Signup** (`app/signup/page.tsx`): same visual language as login; form fields and primary CTA.
- **My Orders** (`app/orders/page.tsx`): list of order cards with status (e.g. In Transit, Delivered, Processing), order number, product thumbnails, “Track Order” / “Order Again” / “Cancel” as in template.
- **Order detail** (e.g. `app/orders/[id]/page.tsx`): delivery status timeline, order items grid, summary (subtotal, shipping, tax, total), shipping address, “Download Invoice” or similar. Match the “Order #DU-8829” screen in the template.
- Use design tokens everywhere; ensure responsive behavior for desktop (see Prompt 2).

**Reference:** `design_template.html` (Order confirmation, Login, My Orders, Order Details screens).

---

## Suggested Order

1. **Translations (3)** – quick win, unblocks consistent copy everywhere.  
2. **Filters overlay (1)** – completes the product listing experience.  
3. **Desktop layout (2)** – improves customer-web UX.  
4. **Order/Login/Orders screens (6)** – completes customer-web flows.  
5. **Shop app (4)** – full design pass on mobile app.  
6. **Admin app (5)** – design pass on admin.

You can run each prompt as a separate task (e.g. paste one block into the AI and run it, then the next).
