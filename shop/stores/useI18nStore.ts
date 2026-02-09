import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/lib/api";

export interface Language {
  id: number;
  code: string;
  name: string;
  is_default: boolean;
  sort_order: number;
}

interface I18nState {
  languages: Language[];
  strings: Record<string, string>;
  currentLanguage: Language | null;
  isLoading: boolean;
  fetchLanguages: () => Promise<void>;
  fetchStrings: (langCode?: string) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const DEFAULT_STRINGS: Record<string, string> = {
  add_to_cart: "Add to Cart",
  add_to_sanctuary: "Add to Sanctuary",
  in_cart: "in cart",
  size: "Size",
  select_size: "Select size",
  view_variants: "View variants",
  wishlist: "Wishlist",
  my_wishlist: "My Wishlist",
  add_to_wishlist: "Add to wishlist",
  remove_from_wishlist: "Remove from wishlist",
  move_to_bag: "Move to Bag",
  sign_in_to_save: "Sign in to save items",
  wishlist_empty: "Your wishlist is empty",
  wishlist_empty_hint: "Save items you love and move them to your bag when you're ready.",
  cart: "Cart",
  checkout: "Checkout",
  products: "Products",
  product: "Product",
  orders: "Orders",
  profile: "Profile",
  sign_in: "Sign In",
  sign_out: "Sign Out",
  sign_up: "Sign Up",
  search: "Search",
  category: "Category",
  brand: "Brand",
  all: "All",
  all_categories: "All Categories",
  in_stock: "In Stock",
  out_of_stock: "Out of Stock",
  featured_products: "Featured Products",
  no_products: "No products found.",
  welcome_title: "Assalamu Alaikum",
  welcome_subtitle: "Welcome to 7alaa",
  no_image: "No Image",
  no_image_available: "No Image Available",
  no_description: "No description available for this product.",
  description: "Description",
  language: "Language",
  search_placeholder: "Search for your home...",
  account_and_lists: "Account & Lists",
  sign_in_or_sign_up_hint: "Sign in or create an account to manage orders and preferences.",
  admin_dashboard: "Admin Dashboard",
  your_profile: "Your Profile",
  returns_and_orders: "Returns & Orders",
  hello: "Hello",
  footer_copyright: "© 2026 7alaa. All rights reserved.",
  no_products_title: "No products found",
  no_products_hint: "Try adjusting your filters or search to find what you're looking for.",
  reviews: "reviews",
  reviews_heading: "Reviews",
  complimentary_delivery: "Complimentary delivery within UAE",
  shop_now: "Shop Now",
  view_all: "View All",
  filters: "Filters",
  sort_by: "Sort By",
  featured: "Featured",
  newest: "Newest",
  price_low_to_high: "Price: Low to High",
  price_high_to_low: "Price: High to Low",
  price_range: "Price Range",
  min_aed: "Min (AED)",
  max_aed: "Max (AED)",
  see_all: "See All",
  show_products: "Show Products",
  reset: "Reset",
  shopping_bag: "Shopping Bag",
  proceed_to_checkout: "Proceed to Checkout",
  order_summary: "Order Summary",
  subtotal: "Subtotal",
  shipping: "Shipping",
  total: "Total",
  delivery_address: "Delivery Address",
  shipping_method: "Shipping Method",
  payment: "Payment",
  place_order: "Place Order",
  secure_checkout: "Secure checkout with UAE-based gateways",
  order_confirmed: "Order confirmed",
  thank_you_order: "Shukran, your order is confirmed",
  thank_you_message: "Your piece of the desert is being prepared with care and will be with you shortly.",
  back_to_home: "Back to Home",
  my_orders: "My Orders",
  track_order: "Track Order",
  order_again: "Order Again",
  login: "Login",
  forgot_password: "Forgot Password?",
  email: "Email Address",
  password: "Password",
  continue_to_oasis: "Continue to 7alaa",
  terms_and_privacy: "By continuing, you agree to our Terms of Service and Privacy Policy",
  home: "Home",
  discover: "Discover",
  saved: "Saved",
  account: "Account",
  change: "Change",
  results: "Results",
  items: "Items",
  new_arrival: "New Arrival",
  curated_for_you: "Curated for You",
  hero_title: "The Desert Collection",
  hero_subtitle: "Elegance inspired by the dunes.",
  your_cart_empty: "Your Cart is Empty",
  your_cart_empty_hint: "Looks like you haven't added anything to your cart yet.",
  your_cart_is_empty: "Your cart is empty",
  start_shopping: "Start Shopping",
  free: "Free",
  express_delivery: "Express Delivery",
  express_delivery_time: "Tomorrow, by 10:00 PM",
  processing: "Processing...",
  step: "Step",
  of: "of",
  continue_to_payment: "Continue to Payment",
  failed_to_initialize_payment: "Failed to initialize payment.",
  failed_to_create_order: "Failed to create order.",
  create_account: "Create Account",
  sign_up_title: "Create Account",
  your_name: "Your name",
  full_name: "Full Name",
  confirm_password: "Re-enter password",
  re_enter_password: "Re-enter password",
  passwords_do_not_match: "Passwords do not match",
  failed_to_create_account: "Failed to create account. Please try again.",
  failed_to_login: "Failed to login. Please check your credentials.",
  new_to_site: "New to 7alaa?",
  create_an_account: "Create an account",
  already_have_account: "Already have an account?",
  dont_have_account: "Don't have an account?",
  thank_you_order_message: "Your payment has been successfully processed and your order has been placed.",
  thank_you_desert_message: "Your piece of the desert is being prepared with care and will be with you shortly.",
  continue_shopping: "Continue Shopping",
  view_and_track_orders: "View and track your order history.",
  no_orders_yet: "You haven't placed any orders yet.",
  view_details: "View Details",
  order_placed: "Order Placed",
  order_number: "Order #",
  ship_to: "Ship To:",
  welcome_back: "Welcome back",
  order_history: "Order History",
  email_placeholder: "name@example.com",
  password_placeholder: "At least 6 characters",
  name_placeholder: "First and last name",
  create_your_account: "Create your account",
  checkout_title: "Checkout",
  mock_payment: "Mock Payment (Development)",
  your_cart_empty_short: "Your cart is empty",
  add_items_to_cart: "Add items to your cart to checkout.",
  street_address_placeholder: "Street Address / Villa Number",
  street: "Street",
  city: "City",
  country: "Country",
  postal_code: "Postal Code",
  city_placeholder: "City",
  emirate_placeholder: "Emirate",
  mobile_placeholder: "Mobile Number",
  qty: "Qty",
  remove: "Remove",
  cancel: "Cancel",
  shipping_address: "Shipping Address",
  edit_review: "Edit review",
  rate: "Rate",
  rate_product: "Rate this product",
  optional_comment: "Optional comment",
  submit: "Submit",
  order_status: "Order Status",
  expected_delivery: "Expected Delivery",
  get_help: "Get Help",
  download_invoice: "Download Invoice",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancel_order: "Cancel",
  enter_sanctuary: "Welcome to 7alaa — your space for refined living",
  delivery_address_heading: "Delivery Address",
  placed: "Placed",
  delivery_status: "Delivery Status",
  order_processed: "Order Processed",
  shipped_from_hub: "Shipped from Dubai Hub",
  out_for_delivery: "Out for Delivery",
  order_items: "Order Items",
  summary: "Summary",
  shipping_details: "Shipping Details",
  shipping_label: "Shipping",
  tax_vat: "Tax (VAT 5%)",
  complimentary: "Complimentary",
  specifications: "Specifications",
  delivery_expected_uae: "Expected within 48 hours in UAE",
  product_not_found: "Product not found",
  shipping_addresses: "Shipping Addresses",
  saved_locations: "Saved Locations",
  saved_locations_hint: "Select your preferred delivery point across the Emirates.",
  add_new_address: "Add New Address",
  default: "Default",
  address_type_home: "Home",
  address_type_office: "Office",
  address_type_other: "Other",
  contact_name: "Contact Name",
  phone: "Phone",
  address_type: "Address Type",
  set_as_default: "Set as default",
  edit: "Edit",
  company_name: "Company Name",
  building_name: "Building / Villa",
  floor_office: "Floor / Unit",
  label_optional: "Label (e.g. Apartment 104)",
  country: "Country",
  add_delivery_address_hint: "Add your delivery address to continue.",
  please_fill_required: "Please fill required fields.",
  please_fill_address_fields: "Please fill all address fields.",
  please_select_or_add_address: "Please select or add an address.",
  address_not_found: "Address not found.",
  failed_to_save_address: "Failed to save address.",
  login_failed: "Login failed",
  network_error: "Network error",
  failed_to_load_product: "Failed to load product",
  failed_to_submit_review: "Failed to submit review",
};

const LANG_STORAGE_KEY = "preferred_lang";

export const useI18nStore = create<I18nState>((set, get) => ({
  languages: [],
  strings: DEFAULT_STRINGS,
  currentLanguage: null,
  isLoading: false,

  fetchLanguages: async () => {
    try {
      const r = await api.get<Language[]>("/i18n/languages");
      set({ languages: r.data });
      const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
      const lang =
        r.data.find((l) => l.code === stored) ||
        r.data.find((l) => l.is_default) ||
        r.data[0];
      if (lang && !get().currentLanguage) set({ currentLanguage: lang });
    } catch {
      set({ languages: [] });
    }
  },

  fetchStrings: async (langCode?: string) => {
    const code = langCode || get().currentLanguage?.code;
    if (!code) return;
    set({ isLoading: true });
    try {
      const r = await api.get<Record<string, string>>("/i18n/strings", {
        params: { lang: code },
      });
      set({ strings: { ...DEFAULT_STRINGS, ...r.data } });
    } catch {
      set({ strings: DEFAULT_STRINGS });
    } finally {
      set({ isLoading: false });
    }
  },

  setLanguage: async (lang: Language) => {
    set({ currentLanguage: lang });
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang.code);
    try {
      await api.post("/i18n/preferences/language", { language_id: lang.id });
      await get().fetchStrings(lang.code);
    } catch {
      await get().fetchStrings(lang.code);
    }
  },

  t: (key: string) => get().strings[key] ?? key,
}));
