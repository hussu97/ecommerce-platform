# Shop App (Expo) – UI/UX Redesign Prompts

Use these prompts **one at a time** to bring the shop app in line with the design system and customer-web. Reference: **`design_template.html`** and **`customer-web`** (FiltersOverlay, ProductCard, Cart, PDP).

**Design tokens (use everywhere):**
- Primary: `#ec9213`
- Background light: `#f8f7f6`
- Sand divider: `#e5e1da`
- Text muted: `#897961`
- Text primary: `#181511`
- Serif for headings/product names; Sans for body
- Rounded corners: `rounded-xl` (12px) for cards/inputs, `rounded-full` for pills and primary buttons

---

## Prompt 1: Filters UI (Modal/Sheet)

**Goal:** Replace the inline category/brand chips with a **Filters** experience that matches customer-web’s FiltersOverlay and the design template.

**Tasks:**
- Add a **“Filters”** button (e.g. next to the search bar or in the header) that opens a **full-screen modal** or **bottom sheet** (React Native `Modal` or a sheet library).
- Build the filters content to match `customer-web/components/FiltersOverlay.tsx` and the “Filters” screen in `design_template.html`:
  - **Header:** “Filters” (serif, bold), Close (X), “Reset” (primary color, right).
  - **Sort By:** Row of pills: Featured, Newest, Price: Low to High, Price: High to Low. Selected = primary background; unselected = white + sand border. Use `t("sort_by")`, `t("featured")`, `t("newest")`, `t("price_low_to_high")`, `t("price_high_to_low")`.
  - **Category:** Section title “Category”. Grid 2 columns: “All Categories” + list of categories; selected = primary border + primary/5 background + check icon. Use `t("all_categories")`, `t("category")`.
  - **Price Range:** Section “Price Range”. Two inputs side by side: “Min (AED)”, “Max (AED)” (labels uppercase, muted; inputs in white cards with sand border). Use `t("price_range")`, `t("min_aed")`, `t("max_aed")`.
  - **Brand:** Section “Brand”, “See all” link (primary). Pills for each brand; selected = primary bg, unselected = white + sand border. Use `t("brand")`, `t("see_all")`.
  - **Attributes:** For each attribute in `filters.attributes`, a section with attribute name and horizontal scroll of option chips/circles (selected = primary border).
- **Footer (sticky):** “Results” label, “X items” count, and a **primary “Show Products”** button (full width or flex). On press: apply filters (update state: sort, categorySlug, brandSlug, selectedOptionIds, minPrice, maxPrice), refetch products with same API params as customer-web (`sort`, `min_price`, `max_price`, `category_slug`, `brand_slug`, `option_ids`), then close the modal.
- Use design tokens for all colors and typography; serif for section titles; rounded-xl for sections and inputs.

**Reference:** `customer-web/components/FiltersOverlay.tsx`, `customer-web/app/page.tsx` (fetch params), `design_template.html` Filters overlay.

---

## Prompt 2: Product Card – Match Customer-Web

**Goal:** Make each product card on the home screen **match** `customer-web/components/ProductCard.tsx` in content order, labels, and in-cart UI.

**Tasks:**
- **Layout (top to bottom):**
  1. **Image:** Aspect ratio **4:5**, rounded-xl, full width of card. Placeholder if no image (muted text “No Image” or icon).
  2. **Title (serif, bold):** Show **product name** as the main title (serif, bold, primary text color). One line, truncate. Link/tap to PDP.
  3. **Subtitle (muted):** One line: **brand name** or category (e.g. `product.brand_name || product.category_path`). Muted color, smaller font. Use `t("brand")` if fallback.
  4. **Rating (optional):** If `avg_rating` or `rating_count` present: star icon (primary color) + “X.X (N)” in muted, small. Use `t("reviews")` if needed.
  5. **Price:** “AED X.XX” in **primary color**, semibold.
  6. **Add to cart / Quantity:**
     - **If quantity === 0:** Single **primary** button: “Add to Cart” (rounded-full, full width, white text). Use `t("add_to_cart")`. Disable if out of stock.
     - **If quantity > 0:** One **horizontal** control: rounded-full **border** (sand divider), background = background-light. Inside: [ minus button ] [ quantity number ] [ plus button ]. Minus/plus are touchable; quantity centered. Match customer-web’s rounded-full pill style (not a rounded rectangle). Disable minus at 1; disable plus at max stock.
- **Card container:** White (or surface) background, sand border, rounded-xl, consistent padding. No extra “favorite” icon unless the design template shows it.
- Use `Colors` and `FontFamily` from the shop’s constants; ensure all copy uses `t("...")`.

**Reference:** `customer-web/components/ProductCard.tsx` (exact order: image → title → subtitle → rating → price → add/qty). `shop/constants/Colors.ts`, `shop/constants/Typography.ts`.

---

## Prompt 3: Cart Screen – Design Theme

**Goal:** Restyle the Cart tab so it matches the design system and customer-web cart feel (cards, typography, primary CTA).

**Tasks:**
- **Empty state:** Centered icon (muted), message “Your cart is empty” (or `t("your_cart_is_empty")`), primary “Continue Shopping” / `t("continue_shopping")` button (rounded-full or rounded-xl).
- **List:** Each cart item = a **card**: white/surface background, sand border, rounded-xl, padding. Layout: small **square or 4:5 thumbnail** left; right side: **product name** (serif, bold), “AED X × Qty” (muted), then a **quantity** control: same style as ProductCard in-cart (rounded-full border sand, minus / qty / plus). “Remove” link/button below (destructive or muted). Use design tokens for all colors.
- **Footer:** Sticky bottom: “Total: AED X.XX” (serif or bold), then full-width **primary** button “Proceed to Checkout” (rounded-xl, white text). Use `t("total")`, `t("proceed_to_checkout")`.
- Ensure typography (serif for product names, sans for body) and spacing feel consistent with the rest of the app.

**Reference:** `design_template.html` (cart/checkout), `customer-web/app/cart/page.tsx`, `shop/app/(tabs)/cart.tsx`.

---

## Prompt 4: Home Screen – Filters Button and Layout

**Goal:** Integrate the new Filters modal and tidy the home layout so it matches customer-web and the template.

**Tasks:**
- **Filters entry:** Add a visible **“Filters”** button (e.g. icon + label) that opens the Filters modal from Prompt 1. Place it near the search bar or below the greeting (e.g. next to “Curated for You”). Use `t("filters")`.
- **Category chips (optional):** You can keep a **short** horizontal row of category chips **or** rely on Filters for category; if kept, style as pills (primary when selected, sand border when not), rounded-full. Do not duplicate the full category grid on the home screen if Filters already has it.
- **Product grid:** Two columns, consistent gap; each cell = one ProductCard (from Prompt 2). Ensure “Curated for You” section title is serif and prominent.
- **Search:** Keep search bar with rounded container, sand border, search icon, placeholder from i18n.
- Remove or reduce any redundant filter UI that is now in the Filters modal (e.g. second row of brand chips if Filters has brands).

**Reference:** `customer-web/app/page.tsx` (Filters button, grid, ProductCard), `shop/app/(tabs)/index.tsx`.

---

## Prompt 5: PDP, Checkout, Login, Orders – Design Consistency

**Goal:** Ensure Product Detail, Checkout, Login, Signup, Orders, and Order Detail screens use the same design tokens and feel (primary buttons, serif titles, sand borders, rounded corners).

**Tasks:**
- **PDP:** Image section (rounded, sand border if needed); product name serif bold; brand/category muted; price primary; stock message; description muted; **Add to Cart** = primary button rounded-xl; when in cart, same rounded-full quantity control as ProductCard. Use Colors and FontFamily.
- **Checkout:** Form inputs with sand border, rounded-xl; section titles serif; primary “Place Order” button; summary card with sand border.
- **Login / Signup:** Same as before but verify: greeting serif, inputs rounded-xl sand border, primary CTA, muted links.
- **Orders list / Order detail:** Cards with sand border, serif for order number/titles, primary for actions (Track, etc.), muted for dates and secondary text.
- Audit all screens for hardcoded grays or old primary; replace with `colors.primary`, `colors.sandDivider`, `colors.textMuted`, `colors.background`, etc. from `Colors.ts`.

**Reference:** `design_template.html`, `shop/constants/Colors.ts`, `shop/app/product/[id].tsx`, `shop/app/checkout.tsx`, `shop/app/login.tsx`, `shop/app/orders.tsx`, `shop/app/order/[id].tsx`.

---

## Suggested Order

1. **Prompt 2** (Product card) – fixes the product box so it matches customer-web.
2. **Prompt 1** (Filters modal) – adds proper filters UI/UX.
3. **Prompt 4** (Home layout) – wires Filters button and cleans layout.
4. **Prompt 3** (Cart) – fixes cart to match design theme.
5. **Prompt 5** (Consistency) – final pass on PDP, Checkout, Login, Orders.

Run each prompt as a separate task (paste one block, implement, then the next).
