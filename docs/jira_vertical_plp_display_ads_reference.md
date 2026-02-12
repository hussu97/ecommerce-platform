# Vertical PLP Display Ads - JIRA Task Reference

Reference document for copying task descriptions into JIRA when bulk CSV import is not used. Source: admon standup meeting minutes ([admon_summary.txt](../admon_summary.txt)).

**How to use:** Use the CSV file `jira_vertical_plp_display_ads.csv` for JIRA bulk import, or copy-paste from this document for manual task creation.

---

## Epic

**Summary:** Vertical PLP display ads go-live

**Labels:** display-ads, vertical-plp

**Description:**
Roll out display ads as a vertical ad banner on PLP pages. Backend injects the ad dynamically; no manual CMS placement per page. Includes: Ad Manager ad type, QC updates, Nami banner generation, backend injection with placement rules, frontend ad banner module strip with beacons. Reference: Admon standup; design doc or proposal to be written by Hussain Abbasi.

---

## Backend Tasks

### BE-1: Add vertical PLP banner creative ad type to Ad Manager

**Summary:** Add vertical PLP banner creative ad type to Ad Manager

**Labels:** backend, display-ads, vertical-plp

**Description:**
- Create a new creative ad type in Ad Manager: `vertical_plp` (or equivalent code).
- Do **not** rely on dimensions alone for identification (current noon code uses dimensions, which can overlap).
- Store dimensions in the database for this ad type for validation and display purposes.
- This ad type will have specific width/height relations and validations.
- Each creative ad type should be manageable in Ad Manager and mappable to CMS modules.

**Acceptance criteria:** Ad Manager supports the new type; creatives can be created and associated with vertical PLP campaigns.

---

### BE-2: Store vertical PLP dimensions in database

**Summary:** Store vertical PLP dimensions in database

**Labels:** backend, display-ads, vertical-plp

**Description:**
- Design schema to store dimensions (width, height) for the vertical PLP banner ad type.
- Dimensions are needed for: validation at upload, QC checks, and frontend rendering.
- Ensure the storage supports a scalable model for future ad types (hero tier 1/2, slim banner, etc.).
- Abdelaziz Hamdan to plan storage; Hussain Abbasi to provide the dimensions.

**Acceptance criteria:** Dimensions are persisted and retrievable; schema supports future ad types.

---

### BE-3: Modify QC prompt for display ad creative template

**Summary:** Modify QC prompt for display ad creative template

**Labels:** backend, display-ads, vertical-plp

**Description:**
- The display ad creative template has: (1) image in top half, (2) title + subtitle in bottom half, (3) background color under text.
- Modify the Quality Check (QC) prompt in Ad Manager to verify:
  - Text appears at the bottom of the image
  - A background color is present for the text area
  - The image is above the text
- Current upload flow assumes a generic banner; QC must be aligned with this template.

**Acceptance criteria:** QC prompt correctly validates display ad creatives against the template.

---

### BE-4: Define ad type in slot table

**Summary:** Define ad type in slot table

**Labels:** backend, display-ads, vertical-plp

**Description:**
- Extend the slot table (or equivalent) to include an `ad_type` (or similar) field.
- This allows the system to distinguish between tier one and tier two banners on CMS-managed slots.
- Currently CMS does not support this differentiation.

**Acceptance criteria:** Slot records can specify which creative ad type they expect; Ad Manager can route accordingly.

---

### BE-5: Create dedicated slot type for vertical PLP in CMS tool

**Summary:** Create dedicated slot type for vertical PLP in CMS tool

**Labels:** backend, display-ads, vertical-plp

**Description:**
- For the vertical PLP ad, handling is fully from the backend (no manual CMS module placement per page).
- Create a dedicated slot type in the CMS tool for "vertical PLP" that is filtered out from normal CMS workflows (or marked as backend-injected).
- This signals that the slot is managed by backend injection, not by on-site teams adding the module manually.

**Acceptance criteria:** CMS tool has a slot type for vertical PLP; it is identifiable as backend-injected.

---

### BE-6: Inject ad banner module into catalog/PLP response with placement rules

**Summary:** Inject ad banner module into catalog/PLP response with placement rules

**Labels:** backend, display-ads, vertical-plp

**Description:**
- Inject the ad banner module into the catalog/PLP API response, similar to how brand ads are injected.
- Placement rules (to be specified by Hussain Abbasi in a separate ticket):
  - One ad per page
  - Second row on desktop
  - Third row on mobile
- Backend controls positioning and frequency; CMS is not consulted for this module type.
- Page URL determines which ads to show; category filtering is not defined at slot/page level.

**Acceptance criteria:** Catalog/PLP response includes the ad module at the correct position; positioning respects desktop vs mobile rules; only one ad per page.

---

### BE-7: Include view and click beacon URLs in ad banner module response

**Summary:** Include view and click beacon URLs in ad banner module response

**Labels:** backend, display-ads, vertical-plp

**Description:**
- The ad banner module strip in the response must include:
  - `view_beacon_url` (or equivalent): URL to fire when the ad is viewed/impressed
  - `click_beacon_url` (or equivalent): URL to fire when the ad is clicked
- Frontend will use these URLs for attribution; they must be provided by the backend.

**Acceptance criteria:** Response includes both beacon URLs; they are valid and trackable by the ads system.

---

### BE-8: Map creative ad types to CMS modules (architecture)

**Summary:** Map creative ad types to CMS modules (architecture)

**Labels:** backend, display-ads, vertical-plp

**Description:**
- Architecture: CMS modules lack strict dimension validations; creative ad types (managed in Ad Manager) have width/height validations.
- Map creative ad types (e.g. hero banner tier 1/2, vertical PLP) to CMS modules.
- Multiple creative types can link to one CMS module; the CMS module specifies the ad type.
- For vertical PLP, this bypasses CMS and is injected from the backend.

**Acceptance criteria:** Ad Manager can resolve which CMS module (or injection path) to use for a given creative ad type.

---

### BE-9: Nami banner generation for vertical PLP widget

**Summary:** Nami banner generation for vertical PLP widget

**Labels:** backend, display-ads, vertical-plp

**Description:**
- The banner-generating feature on Nami must support the new vertical PLP widget.
- Requires dimensions for the vertical PLP format (to be provided by Hussain Abbasi).
- Work is coordinated across the group (see Suggested next steps in meeting minutes in admon_summary.txt).

**Acceptance criteria:** Nami can generate banners in the vertical PLP format with correct dimensions.

---

## Frontend Tasks

### FE-1: Implement ad banner module strip component (desktop and app)

**Summary:** Implement ad banner module strip component (desktop and app)

**Labels:** frontend, display-ads, vertical-plp

**Description:**
- Leverage the existing "banner module strip" by creating a new "ad banner module strip" module type.
- This module renders the existing strip UI but adds:
  - View beacon: fire when the ad enters viewport / is impressed
  - Click beacon: fire when the user clicks the ad
- Implement on **desktop** (customer-web or equivalent) and **app** (shop/mobile).

**Acceptance criteria:** Ad banner module strip renders correctly on desktop and app; beacons fire on view and click.

---

### FE-2: Render ad module from catalog response and respect backend order

**Summary:** Render ad module from catalog response and respect backend order

**Labels:** frontend, display-ads, vertical-plp

**Description:**
- The frontend renders rows and columns as received in the catalog/PLP response.
- The order and placement of modules (including ads) are determined by the backend response.
- Do not hardcode ad position; use the structure returned by the API.
- Display the banner type (e.g. vertical PLP) as specified in the response.

**Acceptance criteria:** Ad module appears in the position defined by the backend; no client-side reordering of modules.

---

### FE-3: Fire attribution beacons (view and click)

**Summary:** Fire attribution beacons (view and click)

**Labels:** frontend, display-ads, vertical-plp

**Description:**
- When the ad enters the viewport (or meets impression criteria), fire the `view_beacon_url` from the response.
- When the user clicks the ad, fire the `click_beacon_url` from the response.
- Handle edge cases: rapid scroll, visibility API, no double-counting of views.

**Acceptance criteria:** View beacon fires once per impression; click beacon fires on click; beacons use URLs from API.

---

## Dependencies and Suggested Order

- **BE-1, BE-2** (ad type + dimensions): Prerequisite for QC, Nami, and injection.
- **BE-3** (QC): Can proceed once BE-1 is done.
- **BE-6, BE-7** (injection + beacons): Require BE-1, BE-5.
- **FE-1, FE-2, FE-3**: Depend on BE-6 and BE-7 returning the ad module and beacon URLs.
- **BE-9** (Nami): Requires dimensions from BE-2 / Hussain.
