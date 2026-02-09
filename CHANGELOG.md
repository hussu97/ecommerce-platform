# Changelog

## [Unreleased]

- **Product parent–child (variants/sizes):** Every product has at least one child (ProductChild). Parent has code, content, price; children have code, barcode, size_value ("single_size" or S/M/L), stock. Single-sized products: one child with size_value "single_size" (user provides barcode only in admin/bulk). Cart, order, and stock reservation always reference product_child_id (required). (customer-api, admin-api, admin-web, customer-web, shop)
- **Customer API:** PDP returns children and single_sized; product list aggregates stock from children; cart and order APIs require child_code; reservations on child. (customer-api)
- **Admin API:** Product create with code generation and at least one child (single-size or multi-size); children CRUD; order status updates child stock on shipped/cancelled. (admin-api)
- **Admin-web:** Product form "Sizes" section with single-size option (barcode only) or multiple sizes; list/add/edit/delete children; product table shows code and aggregated stock. (admin-web)
- **Bulk import:** Option A only—same file with optional columns parent_code, size_value, barcode, is_single_size; single-size rows create one child with size_value "single_size"; multi-size rows create parent+child or add child. (admin-api)
- **Seed:** New structure only; every product has code and one child (single_size); order items and seed data use product_child_id. (customer-api)
- **customer-web & shop:** PDP size selector when multiple sizes; add to cart and cart/checkout use child_code; ProductCard uses first child when one variant. (customer-web, shop)
- **Listing and PDP add-to-cart:** Product list shows only products with at least one child in stock. Listing: single-sized products show Add to cart (and qty); multi-sized show "View variants" linking to PDP. PDP: single-sized show Add to cart only; multi-sized show "Select size" (scrolls to sizes) until a size is selected, then "Add to cart"; out-of-stock sizes disabled. (customer-api, customer-web, shop)
