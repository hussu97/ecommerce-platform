"""
Reset database (drop and recreate all tables) and seed with:
- Admin user (admin@example.com / admin123)
- 2-4 sample customers (customer1@example.com ... / customer123)
- Languages: English (default), Arabic
- Taxonomies with EN+AR
- Taxonomy attributes/options with EN+AR
- 3-5 Brands with EN+AR
- 5 Products with EN+AR
- UI strings (EN+AR)
- Sample addresses (1-2 per customer)
- Sample orders (3-5 per customer) with order items and some reviews
"""
import asyncio
import random
import re
import uuid
from sqlalchemy import select, delete
from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base
from app.models import (
    user, product, product_child, order, cart, taxonomy, brand, taxonomy_attribute,
    product_attribute_value, language, product_translation, taxonomy_translation,
    brand_translation, taxonomy_attribute_translation, ui_string, visitor_preference,
    stock_reservation, product_review, customer_address, audit_log,
)
from app.models.user import User
from app.models.language import Language
from app.models.taxonomy import Taxonomy
from app.models.taxonomy_attribute import TaxonomyAttribute, TaxonomyAttributeOption
from app.models.taxonomy_translation import TaxonomyTranslation
from app.models.taxonomy_attribute_translation import TaxonomyAttributeTranslation, TaxonomyAttributeOptionTranslation
from app.models.brand import Brand
from app.models.brand_translation import BrandTranslation
from app.models.product import Product
from app.models.product_child import ProductChild
from app.models.product_translation import ProductTranslation
from app.models.product_attribute_value import ProductAttributeValue
from app.models.ui_string import UIString
from app.models.customer_address import CustomerAddress
from app.models.order import Order, OrderItem
from app.models.product_review import ProductReview
from app.core.security import get_password_hash
from app.core.config import settings


def slugify(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "untitled"


# Taxonomies: (name_en, section, sort_order, name_ar)
TAXONOMIES = [
    ("Electric & Electronics", "Electronics", 1, "الإلكترونيات والكهرباء"),
    ("Home Improvement Tools", "Home", 2, "أدوات تحسين المنزل"),
    ("Health & Personal Care", "Health", 3, "الصحة والعناية الشخصية"),
    ("Men & Women's Fashion", "Fashion", 4, "أزياء الرجال والنساء"),
    ("Outdoors, Fitness & Sports", "Sports", 5, "الرياضة واللياقة الخارجية"),
    ("Mobiles, Tablets & Accessories", "Electronics", 6, "الهواتف والأجهزة اللوحية"),
    ("Smart Devices & Accessories", "Electronics", 7, "الأجهزة الذكية وملحقاتها"),
    ("Travel Accessories", "Travel", 8, "إكسسوارات السفر"),
    ("Seasonal Products", "Seasonal", 9, "المنتجات الموسمية"),
    ("Smart Watch & Band", "Electronics", 10, "الساعات الذكية والأساور"),
]

# taxonomy_name -> [(attr_name_en, [options_en], attr_name_ar, [options_ar])]
TAXONOMY_ATTRIBUTES = {
    "Electric & Electronics": [
        ("Brand Type", ["Budget", "Mid-Range", "Premium", "Luxury"], "نوع العلامة", ["اقتصادي", "متوسط", "متميز", "فاخر"]),
        ("Power Source", ["Battery", "AC Adapter", "USB"], "مصدر الطاقة", ["بطارية", "محول التيار", "يو إس بي"]),
        ("Connectivity", ["Wired", "Wireless", "Bluetooth", "Wi-Fi"], "الاتصال", ["سلكي", "لاسلكي", "بلوتوث", "واي فاي"]),
    ],
    "Health & Personal Care": [
        ("Product Type", ["Skincare", "Haircare", "Oral Care", "Vitamins"], "نوع المنتج", ["العناية بالبشرة", "العناية بالشعر", "العناية بالفم", "فيتامينات"]),
        ("Skin Type", ["All", "Dry", "Oily", "Sensitive"], "نوع البشرة", ["الكل", "جافة", "دهنية", "حساسة"]),
        ("Age Group", ["Adults", "Teens", "Kids", "All Ages"], "الفئة العمرية", ["بالغون", "مراهقون", "أطفال", "جميع الأعمار"]),
    ],
    "Men & Women's Fashion": [
        ("Size", ["XS", "S", "M", "L", "XL"], "المقاس", ["XS", "S", "M", "L", "XL"]),
        ("Color", ["Black", "White", "Navy", "Gray", "Red", "Blue"], "اللون", ["أسود", "أبيض", "أزرق بحري", "رمادي", "أحمر", "أزرق"]),
        ("Material", ["Cotton", "Polyester", "Wool", "Denim"], "المادة", ["قطن", "بوليستر", "صوف", "جينز"]),
    ],
    "Outdoors, Fitness & Sports": [
        ("Activity", ["Running", "Cycling", "Gym", "Hiking"], "النشاط", ["الجري", "ركوب الدراجات", "الجيم", "المشي لمسافات طويلة"]),
        ("Size", ["XS", "S", "M", "L", "XL"], "المقاس", ["XS", "S", "M", "L", "XL"]),
    ],
    "Mobiles, Tablets & Accessories": [
        ("OS", ["Android", "iOS", "Windows"], "نظام التشغيل", ["أندرويد", "آي أو إس", "ويندوز"]),
        ("Screen Size", ["< 5\"", "5-6\"", "6-7\"", "10\"+"], "حجم الشاشة", ["أقل من 5 بوصة", "5-6 بوصة", "6-7 بوصة", "10+ بوصة"]),
        ("Storage", ["64GB", "128GB", "256GB", "512GB"], "التخزين", ["64 جيجا", "128 جيجا", "256 جيجا", "512 جيجا"]),
    ],
    "Smart Devices & Accessories": [
        ("Device Type", ["Speaker", "Display", "Camera", "Sensor"], "نوع الجهاز", ["مكبر صوت", "شاشة", "كاميرا", "مستشعر"]),
        ("Connectivity", ["Wi-Fi", "Bluetooth", "Zigbee"], "الاتصال", ["واي فاي", "بلوتوث", "زيجبي"]),
    ],
}

# Brands: (name_en, name_ar)
BRANDS = [
    ("Apple", "أبل"),
    ("Samsung", "سامسونج"),
    ("Nike", "نايك"),
    ("Sony", "سوني"),
    ("Bose", "بوز"),
]

# Products: (name_en, desc_en, name_ar, desc_ar, price, stock, image_url, taxonomy_name, brand_name, attr_pairs[, children_spec])
# children_spec omitted or None = single-sized (one child with size_value single_size). children_spec = [(size_value, barcode, stock), ...] = multi-sized.
PRODUCTS = [
    (
        "Wireless Noise-Canceling Headphones",
        "Premium over-ear headphones with active noise cancellation and 30-hour battery life.",
        "سماعات لاسلكية بإلغاء الضوضاء",
        "سماعات رأس متميزة بإلغاء الضوضاء النشط وبطارية تدوم 30 ساعة.",
        299.99, 50,
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
        "Electric & Electronics", "Bose",
        [("Brand Type", "Premium"), ("Power Source", "Battery"), ("Connectivity", "Bluetooth")],
    ),
    (
        "Smartphone 13 Pro",
        "Latest model with advanced triple-camera system and super retina XDR display.",
        "هاتف ذكي 13 برو",
        "أحدث طراز مع نظام كاميرا ثلاثية متقدم وشاشة Super Retina XDR.",
        999.00, 20,
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
        "Mobiles, Tablets & Accessories", "Apple",
        [("OS", "iOS"), ("Screen Size", "6-7\""), ("Storage", "256GB")],
    ),
    (
        "Vitamin C Serum",
        "Brightening serum with 20% vitamin C and hyaluronic acid for radiant skin.",
        "مصل فيتامين سي",
        "مصل مضيء بفيتامين سي 20٪ وحمض الهيالورونيك للبشرة المتألقة.",
        45.00, 80,
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80",
        "Health & Personal Care", "Samsung",
        [("Product Type", "Skincare"), ("Skin Type", "All"), ("Age Group", "Adults")],
    ),
    (
        "Running Sneakers",
        "Lightweight running shoes with cushioning for everyday runs.",
        "حذاء رياضي للجري",
        "حذاء جري خفيف مع وسادات لليوميات.",
        129.99, 45,
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
        "Outdoors, Fitness & Sports", "Nike",
        [("Activity", "Running"), ("Size", "M")],
    ),
    (
        "Smart Home Speaker",
        "Voice-controlled smart speaker with premium sound.",
        "مكبر صوت ذكي للمنزل",
        "مكبر صوت ذكي يتحكم بالصوت مع صوت متميز.",
        129.00, 30,
        "https://images.unsplash.com/photo-1589492477829-5e65395b66cc?auto=format&fit=crop&w=800&q=80",
        "Smart Devices & Accessories", "Sony",
        [("Connectivity", "Wi-Fi")],
    ),
    # 5 multi-sized products (Fashion / Outdoors with Size variants)
    (
        "Cotton T-Shirt",
        "Soft cotton crew neck t-shirt, perfect for everyday wear.",
        "تيشيرت قطني",
        "تيشيرت قطني طري برقبة دائرية، مثالي للارتداء اليومي.",
        49.99, 0,
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
        "Men & Women's Fashion", "Nike",
        [("Color", "Navy"), ("Material", "Cotton")],
        [("S", "TEE-NV-S", 8), ("M", "TEE-NV-M", 12), ("L", "TEE-NV-L", 10), ("XL", "TEE-NV-XL", 5)],
    ),
    (
        "Classic Hoodie",
        "Comfortable pullover hoodie with kangaroo pocket.",
        "هودي كلاسيكي",
        "هودي مريح مع جيب كنغارو.",
        89.99, 0,
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80",
        "Men & Women's Fashion", "Nike",
        [("Color", "Gray"), ("Material", "Cotton")],
        [("S", "HOD-GR-S", 6), ("M", "HOD-GR-M", 14), ("L", "HOD-GR-L", 11), ("XL", "HOD-GR-XL", 4)],
    ),
    (
        "Running Shorts",
        "Lightweight breathable shorts for running and training.",
        "شورت جري",
        "شورت خفيف تنفس للجري والتدريب.",
        39.99, 0,
        "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=80",
        "Outdoors, Fitness & Sports", "Nike",
        [("Activity", "Running")],
        [("S", "SHT-RUN-S", 9), ("M", "SHT-RUN-M", 15), ("L", "SHT-RUN-L", 12)],
    ),
    (
        "Yoga Pants",
        "High-waist stretch yoga pants for comfort and flexibility.",
        "بنطلون يوغا",
        "بنطلون يوغا عالي الخصر مريح ومرن.",
        59.99, 0,
        "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80",
        "Outdoors, Fitness & Sports", "Nike",
        [("Activity", "Gym")],
        [("S", "YOG-GY-S", 7), ("M", "YOG-GY-M", 13), ("L", "YOG-GY-L", 10), ("XL", "YOG-GY-XL", 6)],
    ),
    (
        "Training Jacket",
        "Lightweight windbreaker jacket for outdoor training.",
        "جاكيت تدريب",
        "جاكيت خفيف مضاد للرياح للتدريب الخارجي.",
        79.99, 0,
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
        "Outdoors, Fitness & Sports", "Nike",
        [("Activity", "Running")],
        [("S", "JKT-RUN-S", 5), ("M", "JKT-RUN-M", 11), ("L", "JKT-RUN-L", 9)],
    ),
]

# UI strings: EN and AR for customer-web and shop (keys from both apps)
UI_STRINGS = {
    "en": {
        "add_to_cart": "Add to Cart", "add_to_sanctuary": "Add to Sanctuary", "in_cart": "in cart",
        "cart": "Cart", "checkout": "Checkout", "products": "Products", "product": "Product",
        "orders": "Orders", "profile": "Profile", "sign_in": "Sign In", "sign_out": "Sign Out",
        "sign_up": "Sign Up", "search": "Search", "category": "Category", "brand": "Brand",
        "all": "All", "all_categories": "All Categories", "in_stock": "In Stock",
        "out_of_stock": "Out of Stock", "featured_products": "Featured Products",
        "no_products": "No products found.", "welcome_title": "Assalamu Alaikum",
        "welcome_subtitle": "Welcome to 7alaa", "no_image": "No Image",
        "no_image_available": "No Image Available",
        "no_description": "No description available for this product.", "description": "Description",
        "language": "Language", "search_placeholder": "Search for your home...",
        "account_and_lists": "Account & Lists",
        "sign_in_or_sign_up_hint": "Sign in or create an account to manage orders and preferences.",
        "admin_dashboard": "Admin Dashboard", "your_profile": "Your Profile",
        "returns_and_orders": "Returns & Orders", "hello": "Hello",
        "footer_copyright": "© 2026 7alaa. All rights reserved.",
        "no_products_title": "No products found",
        "no_products_hint": "Try adjusting your filters or search to find what you're looking for.",
        "reviews": "reviews", "reviews_heading": "Reviews",
        "complimentary_delivery": "Complimentary delivery within UAE",
        "shop_now": "Shop Now", "view_all": "View All", "filters": "Filters", "sort_by": "Sort By",
        "featured": "Featured", "newest": "Newest", "price_low_to_high": "Price: Low to High",
        "price_high_to_low": "Price: High to Low", "price_range": "Price Range",
        "min_aed": "Min (AED)", "max_aed": "Max (AED)", "see_all": "See All",
        "show_products": "Show Products", "reset": "Reset", "shopping_bag": "Shopping Bag",
        "proceed_to_checkout": "Proceed to Checkout", "order_summary": "Order Summary",
        "subtotal": "Subtotal", "shipping": "Shipping", "total": "Total",
        "delivery_address": "Delivery Address", "shipping_method": "Shipping Method",
        "payment": "Payment", "place_order": "Place Order",
        "secure_checkout": "Secure checkout with UAE-based gateways",
        "order_confirmed": "Order confirmed", "thank_you_order": "Shukran, your order is confirmed",
        "thank_you_message": "Your piece of the desert is being prepared with care and will be with you shortly.",
        "back_to_home": "Back to Home", "my_orders": "My Orders", "track_order": "Track Order",
        "order_again": "Order Again", "login": "Login", "forgot_password": "Forgot Password?",
        "email": "Email Address", "password": "Password", "continue_to_oasis": "Continue to 7alaa",
        "terms_and_privacy": "By continuing, you agree to our Terms of Service and Privacy Policy",
        "home": "Home", "discover": "Discover", "saved": "Saved", "account": "Account",
        "change": "Change", "results": "Results", "items": "Items",
        "new_arrival": "New Arrival", "curated_for_you": "Curated for You",
        "hero_title": "The Desert Collection", "hero_subtitle": "Elegance inspired by the dunes.",
        "your_cart_empty": "Your Cart is Empty",
        "your_cart_empty_hint": "Looks like you haven't added anything to your cart yet.",
        "your_cart_is_empty": "Your cart is empty", "start_shopping": "Start Shopping",
        "free": "Free", "express_delivery": "Express Delivery",
        "express_delivery_time": "Tomorrow, by 10:00 PM", "processing": "Processing...",
        "step": "Step", "of": "of", "continue_to_payment": "Continue to Payment",
        "failed_to_initialize_payment": "Failed to initialize payment.",
        "failed_to_create_order": "Failed to create order.", "create_account": "Create Account",
        "sign_up_title": "Create Account", "your_name": "Your name",
        "confirm_password": "Re-enter password", "re_enter_password": "Re-enter password",
        "passwords_do_not_match": "Passwords do not match",
        "failed_to_create_account": "Failed to create account. Please try again.",
        "failed_to_login": "Failed to login. Please check your credentials.",
        "new_to_site": "New to 7alaa?", "create_an_account": "Create an account",
        "already_have_account": "Already have an account?", "dont_have_account": "Don't have an account?",
        "thank_you_order_message": "Your payment has been successfully processed and your order has been placed.",
        "thank_you_desert_message": "Your piece of the desert is being prepared with care and will be with you shortly.",
        "order_status": "Order Status", "expected_delivery": "Expected Delivery",
        "get_help": "Get Help", "download_invoice": "Download Invoice",
        "in_transit": "In Transit", "delivered": "Delivered", "cancel_order": "Cancel",
        "enter_sanctuary": "Welcome to 7alaa — your space for refined living",
        "delivery_address_heading": "Delivery Address", "placed": "Placed",
        "delivery_status": "Delivery Status", "order_items": "Order Items", "summary": "Summary",
        "shipping_details": "Shipping Details", "shipping_label": "Shipping",
        "tax_vat": "Tax (VAT 5%)", "complimentary": "Complimentary",
        "continue_shopping": "Continue Shopping",
        "view_and_track_orders": "View and track your order history.",
        "no_orders_yet": "You haven't placed any orders yet.",
        "view_details": "View Details", "order_placed": "Order Placed", "order_number": "Order #",
        "ship_to": "Ship To:", "welcome_back": "Welcome back", "order_history": "Order History",
        "full_name": "Full Name", "email_placeholder": "name@example.com",
        "password_placeholder": "At least 6 characters", "name_placeholder": "First and last name",
        "create_your_account": "Create your account", "checkout_title": "Checkout",
        "mock_payment": "Mock Payment (Development)", "your_cart_empty_short": "Your cart is empty",
        "add_items_to_cart": "Add items to your cart to checkout.",
        "street_address_placeholder": "Street Address / Villa Number", "street": "Street",
        "city_placeholder": "City", "emirate_placeholder": "Emirate",
        "mobile_placeholder": "Mobile Number", "qty": "Qty", "remove": "Remove", "cancel": "Cancel",
        "specifications": "Specifications", "delivery_expected_uae": "Expected within 48 hours in UAE",
        "product_not_found": "Product not found", "shipping_addresses": "Shipping Addresses",
        "saved_locations": "Saved Locations",
        "saved_locations_hint": "Select your preferred delivery point across the Emirates.",
        "add_new_address": "Add New Address", "default": "Default",
        "address_type_home": "Home", "address_type_office": "Office", "address_type_other": "Other",
        "contact_name": "Contact Name", "phone": "Phone", "address_type": "Address Type",
        "set_as_default": "Set as default", "edit": "Edit", "company_name": "Company Name",
        "building_name": "Building / Villa", "floor_office": "Floor / Unit",
        "label_optional": "Label (e.g. Apartment 104)", "confirm_location": "Confirm Location",
        "pin_location": "Pin Location on Map", "country": "Country",
        "add_delivery_address_hint": "Add your delivery address to continue.",
        "please_fill_required": "Please fill required fields.",
        "please_fill_address_fields": "Please fill all address fields.",
        "please_select_or_add_address": "Please select or add an address.",
        "address_not_found": "Address not found.",
        "failed_to_save_address": "Failed to save address.",
        "saving": "Saving...", "login_failed": "Login failed",
        "payment_order_failed": "Payment succeeded but failed to create order. Please contact support.",
        "payment_failed": "Payment failed or was cancelled.",
        "unexpected_error": "An unexpected error occurred.",
        "failed_to_load_product": "Failed to load product details.",
        "failed_to_load_products": "Failed to load products. Please try again later.",
        "network_error": "Network error",
        "arriving_soon": "Arriving soon", "preparing_for_courier": "Preparing for courier",
        "failed_to_submit_review": "Failed to submit review", "received_on": "Received",
        "shipping_address": "Shipping Address", "city": "City", "postal_code": "Postal Code",
        "order_processed": "Order Processed", "shipped_from_hub": "Shipped from Dubai Hub",
        "out_for_delivery": "Out for Delivery", "shipped": "Shipped",
        "status_processing": "Processing", "timeline": "Timeline", "support": "Support",
        "section_status": "Status",
        "edit_review": "Edit review", "rate": "Rate",
        "rate_product": "Rate this product", "optional_comment": "Optional comment", "submit": "Submit",
        "size": "Size", "select_size": "Select size", "view_variants": "View variants",
    },
    "ar": {
        "add_to_cart": "أضف إلى السلة", "add_to_sanctuary": "أضف إلى الملاذ", "in_cart": "في السلة",
        "cart": "السلة", "checkout": "الدفع", "products": "المنتجات", "product": "المنتج",
        "orders": "الطلبات", "profile": "الملف", "sign_in": "تسجيل الدخول", "sign_out": "تسجيل الخروج",
        "sign_up": "التسجيل", "search": "بحث", "category": "الفئة", "brand": "العلامة التجارية",
        "all": "الكل", "all_categories": "جميع الفئات", "in_stock": "متوفر",
        "out_of_stock": "غير متوفر", "featured_products": "منتجات مميزة",
        "no_products": "لم يتم العثور على منتجات.", "welcome_title": "السلام عليكم",
        "welcome_subtitle": "مرحباً بك في 7alaa", "no_image": "بدون صورة",
        "no_image_available": "لا توجد صورة متاحة",
        "no_description": "لا يوجد وصف متاح لهذا المنتج.", "description": "الوصف",
        "language": "اللغة", "search_placeholder": "ابحث عن منزلك...",
        "account_and_lists": "الحساب والقوائم",
        "sign_in_or_sign_up_hint": "سجّل الدخول أو أنشئ حساباً لإدارة الطلبات والتفضيلات.",
        "admin_dashboard": "لوحة الإدارة", "your_profile": "ملفك الشخصي",
        "returns_and_orders": "المرتجعات والطلبات", "hello": "مرحباً",
        "footer_copyright": "© 2026 7alaa. جميع الحقوق محفوظة.",
        "no_products_title": "لم يتم العثور على منتجات",
        "no_products_hint": "جرّب تعديل الفلاتر أو البحث للعثور على ما تبحث عنه.",
        "reviews": "تقييمات", "reviews_heading": "التقييمات",
        "complimentary_delivery": "توصيل مجاني ضمن الإمارات",
        "shop_now": "تسوّق الآن", "view_all": "عرض الكل", "filters": "الفلاتر", "sort_by": "ترتيب حسب",
        "featured": "مميز", "newest": "الأحدث", "price_low_to_high": "السعر: من الأقل للأعلى",
        "price_high_to_low": "السعر: من الأعلى للأقل", "price_range": "نطاق السعر",
        "min_aed": "الحد الأدنى (درهم)", "max_aed": "الحد الأقصى (درهم)", "see_all": "عرض الكل",
        "show_products": "عرض المنتجات", "reset": "إعادة تعيين", "shopping_bag": "حقيبة التسوق",
        "proceed_to_checkout": "المتابعة للدفع", "order_summary": "ملخص الطلب",
        "subtotal": "المجموع الفرعي", "shipping": "الشحن", "total": "الإجمالي",
        "delivery_address": "عنوان التوصيل", "shipping_method": "طريقة الشحن",
        "payment": "الدفع", "place_order": "تأكيد الطلب",
        "secure_checkout": "دفع آمن عبر بوابات الإمارات",
        "order_confirmed": "تم تأكيد الطلب", "thank_you_order": "شكراً، تم تأكيد طلبك",
        "thank_you_message": "قطعتك من الصحراء قيد التحضير وسنوصلها إليك قريباً.",
        "back_to_home": "العودة للرئيسية", "my_orders": "طلباتي", "track_order": "تتبع الطلب",
        "order_again": "إعادة الطلب", "login": "تسجيل الدخول", "forgot_password": "نسيت كلمة المرور؟",
        "email": "البريد الإلكتروني", "password": "كلمة المرور", "continue_to_oasis": "متابعة إلى 7alaa",
        "terms_and_privacy": "بالمتابعة، أنت توافق على الشروط وسياسة الخصوصية",
        "home": "الرئيسية", "discover": "اكتشف", "saved": "المحفوظ", "account": "الحساب",
        "change": "تغيير", "results": "النتائج", "items": "العناصر",
        "new_arrival": "وصل جديد", "curated_for_you": "مختار لك",
        "hero_title": "مجموعة الصحراء", "hero_subtitle": "أناقة مستوحاة من الكثبان.",
        "your_cart_empty": "سلة التسوق فارغة",
        "your_cart_empty_hint": "يبدو أنك لم تضف أي شيء إلى سلتك بعد.",
        "your_cart_is_empty": "سلة التسوق فارغة", "start_shopping": "ابدأ التسوق",
        "free": "مجاني", "express_delivery": "توصيل سريع",
        "express_delivery_time": "غداً، الساعة 10 مساءً", "processing": "جاري المعالجة...",
        "step": "خطوة", "of": "من", "continue_to_payment": "متابعة للدفع",
        "failed_to_initialize_payment": "فشل تهيئة الدفع.",
        "failed_to_create_order": "فشل إنشاء الطلب.", "create_account": "إنشاء حساب",
        "sign_up_title": "إنشاء حساب", "your_name": "اسمك",
        "confirm_password": "أعد إدخال كلمة المرور", "re_enter_password": "أعد إدخال كلمة المرور",
        "passwords_do_not_match": "كلمات المرور غير متطابقة",
        "failed_to_create_account": "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.",
        "failed_to_login": "فشل تسجيل الدخول. تحقق من بياناتك.",
        "new_to_site": "جديد على 7alaa؟", "create_an_account": "إنشاء حساب",
        "already_have_account": "لديك حساب بالفعل؟", "dont_have_account": "ليس لديك حساب؟",
        "thank_you_order_message": "تمت معالجة الدفع بنجاح ووضع طلبك.",
        "thank_you_desert_message": "قطعتك من الصحراء قيد التحضير وسنوصلها إليك قريباً.",
        "order_status": "حالة الطلب", "expected_delivery": "التوصيل المتوقع",
        "get_help": "المساعدة", "download_invoice": "تحميل الفاتورة",
        "in_transit": "في الطريق", "delivered": "تم التوصيل", "cancel_order": "إلغاء",
        "enter_sanctuary": "مرحباً بك في 7alaa — مساحتك للعيش الراقي",
        "delivery_address_heading": "عنوان التوصيل", "placed": "تم الطلب",
        "delivery_status": "حالة التوصيل", "order_items": "عناصر الطلب", "summary": "الملخص",
        "shipping_details": "تفاصيل الشحن", "shipping_label": "الشحن",
        "tax_vat": "الضريبة (ضريبة القيمة المضافة 5٪)", "complimentary": "مجاني",
        "continue_shopping": "متابعة التسوق",
        "view_and_track_orders": "عرض وتتبع سجل طلباتك.",
        "no_orders_yet": "لم تقدم أي طلبات بعد.",
        "view_details": "عرض التفاصيل", "order_placed": "تم الطلب", "order_number": "طلب #",
        "ship_to": "الشحن إلى:", "welcome_back": "مرحباً بعودتك", "order_history": "سجل الطلبات",
        "full_name": "الاسم الكامل", "email_placeholder": "name@example.com",
        "password_placeholder": "6 أحرف على الأقل", "name_placeholder": "الاسم الكامل",
        "create_your_account": "إنشاء حسابك", "checkout_title": "الدفع",
        "mock_payment": "دفع تجريبي (التطوير)", "your_cart_empty_short": "سلتك فارغة",
        "add_items_to_cart": "أضف عناصر إلى سلتك للدفع.",
        "street_address_placeholder": "العنوان / رقم الفيلا", "street": "الشارع",
        "city_placeholder": "المدينة", "emirate_placeholder": "الإمارة",
        "mobile_placeholder": "رقم الجوال", "qty": "الكمية", "remove": "إزالة", "cancel": "إلغاء",
        "specifications": "المواصفات", "delivery_expected_uae": "متوقع خلال 48 ساعة في الإمارات",
        "product_not_found": "المنتج غير موجود", "shipping_addresses": "عنوان الشحن",
        "saved_locations": "المواقع المحفوظة",
        "saved_locations_hint": "اختر نقطة التوصيل المفضلة لديك في الإمارات.",
        "add_new_address": "إضافة عنوان جديد", "default": "افتراضي",
        "address_type_home": "المنزل", "address_type_office": "المكتب", "address_type_other": "أخرى",
        "contact_name": "اسم جهة الاتصال", "phone": "الهاتف", "address_type": "نوع العنوان",
        "set_as_default": "تعيين كافتراضي", "edit": "تعديل", "company_name": "اسم الشركة",
        "building_name": "المبنى / الفيلا", "floor_office": "الطابق / الوحدة",
        "label_optional": "التسمية (مثال: شقة 104)", "confirm_location": "تأكيد الموقع",
        "pin_location": "تحديد الموقع على الخريطة", "country": "الدولة",
        "add_delivery_address_hint": "أضف عنوان التوصيل للمتابعة.",
        "please_fill_required": "يرجى ملء الحقول المطلوبة.",
        "please_fill_address_fields": "يرجى ملء جميع حقول العنوان.",
        "please_select_or_add_address": "يرجى اختيار أو إضافة عنوان.",
        "address_not_found": "العنوان غير موجود.",
        "failed_to_save_address": "فشل حفظ العنوان.",
        "saving": "جاري الحفظ...", "login_failed": "فشل تسجيل الدخول",
        "payment_order_failed": "نجح الدفع لكن فشل إنشاء الطلب. اتصل بالدعم.",
        "payment_failed": "فشل الدفع أو تم إلغاؤه.",
        "unexpected_error": "حدث خطأ غير متوقع.",
        "failed_to_load_product": "فشل تحميل تفاصيل المنتج.",
        "failed_to_load_products": "فشل تحميل المنتجات. يرجى المحاولة لاحقاً.",
        "network_error": "خطأ في الشبكة",
        "arriving_soon": "قريباً", "preparing_for_courier": "جاري التحضير للتوصيل",
        "failed_to_submit_review": "فشل إرسال التقييم", "received_on": "تم الاستلام",
        "shipping_address": "عنوان الشحن", "city": "المدينة", "postal_code": "الرمز البريدي",
        "order_processed": "تمت معالجة الطلب", "shipped_from_hub": "شُحن من مركز دبي",
        "out_for_delivery": "خارج للتوصيل", "shipped": "تم الشحن",
        "status_processing": "جاري المعالجة", "timeline": "الجدول الزمني", "support": "الدعم",
        "section_status": "الحالة",
        "edit_review": "تعديل التقييم", "rate": "قيّم",
        "rate_product": "قيّم هذا المنتج", "optional_comment": "تعليق اختياري", "submit": "إرسال",
        "size": "المقاس", "select_size": "اختر المقاس", "view_variants": "عرض المقاسات",
    },
}


async def reset_and_seed():
    print("Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    print("Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Languages
        print("Seeding languages...")
        for code, name, is_default, sort_order in [("en", "English", True, 1), ("ar", "العربية", False, 2)]:
            session.add(Language(code=code, name=name, is_default=is_default, sort_order=sort_order))
        await session.commit()

        # 2. Admin user
        print("Seeding admin user...")
        hashed = get_password_hash("admin123")
        session.add(User(email="admin@example.com", password_hash=hashed, full_name="System Admin",
                         is_active=True, is_superuser=True, role="admin"))
        await session.commit()

        # 3. Taxonomies + translations
        print("Seeding taxonomies...")
        result = await session.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        tax_by_name = {}
        for name_en, section, sort_order, name_ar in TAXONOMIES:
            t = Taxonomy(name=name_en, slug=slugify(name_en), section=section, sort_order=sort_order)
            session.add(t)
            await session.flush()
            tax_by_name[name_en] = t
            session.add(TaxonomyTranslation(taxonomy_id=t.id, language_id=langs["ar"].id, name=name_ar))
        await session.commit()

        # 4. Taxonomy attributes + options + translations
        print("Seeding taxonomy attributes...")
        for tax_name, attrs in TAXONOMY_ATTRIBUTES.items():
            tax = tax_by_name.get(tax_name)
            if not tax:
                continue
            for i, (attr_en, opts_en, attr_ar, opts_ar) in enumerate(attrs):
                attr = TaxonomyAttribute(taxonomy_id=tax.id, name=attr_en, type_="select", sort_order=i)
                session.add(attr)
                await session.flush()
                session.add(TaxonomyAttributeTranslation(attribute_id=attr.id, language_id=langs["ar"].id, name=attr_ar))
                for j, (opt_en, opt_ar) in enumerate(zip(opts_en, opts_ar)):
                    opt = TaxonomyAttributeOption(attribute_id=attr.id, value=opt_en, sort_order=j)
                    session.add(opt)
                    await session.flush()
                    session.add(TaxonomyAttributeOptionTranslation(option_id=opt.id, language_id=langs["ar"].id, value=opt_ar))
        await session.commit()

        # 5. Brands + translations
        print("Seeding brands...")
        brand_by_name = {}
        for name_en, name_ar in BRANDS:
            b = Brand(name=name_en, slug=slugify(name_en))
            session.add(b)
            await session.flush()
            brand_by_name[name_en] = b
            session.add(BrandTranslation(brand_id=b.id, language_id=langs["ar"].id, name=name_ar))
        await session.commit()

        # 6. Products + code + children (single or multi-sized) + translations
        print("Seeding products...")
        product_ids: list[str] = []
        product_id_to_first_child_id: dict[str, int] = {}
        for row in PRODUCTS:
            name_en, desc_en, name_ar, desc_ar, price, stock, img, tax_name, brand_name, attr_pairs = row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9]
            children_spec = row[10] if len(row) >= 11 else None
            tax = tax_by_name.get(tax_name)
            brand_obj = brand_by_name.get(brand_name)
            cat_id = tax.id if tax else None
            brand_id = brand_obj.id if brand_obj else None

            base_slug = slugify(name_en)
            slug = base_slug
            n = 1
            while True:
                r = await session.execute(select(Product.id).where(Product.slug == slug))
                if r.scalar_one_or_none() is None:
                    break
                slug = f"{base_slug}-{n}"
                n += 1

            code = f"{settings.PARENT_CODE_PREFIX}{uuid.uuid4().hex[:8].upper()}{settings.PARENT_CODE_SUFFIX}"
            p = Product(
                code=code,
                name=name_en,
                slug=slug,
                description=desc_en,
                price=price,
                stock_quantity=0,
                stock_reserved=0,
                image_url=img,
                category_id=cat_id,
                brand_id=brand_id,
                is_active=True,
            )
            session.add(p)
            await session.flush()
            product_ids.append(p.id)
            p_id_snippet = p.id[:8].upper() if len(p.id) >= 8 else p.id.upper()
            if children_spec is None:
                child_code = f"{settings.CHILD_CODE_PREFIX}{p_id_snippet}-1{settings.CHILD_CODE_SUFFIX}"
                child = ProductChild(
                    product_id=p.id,
                    code=child_code,
                    barcode=None,
                    size_value=settings.SINGLE_SIZE_VALUE,
                    stock_quantity=stock,
                    stock_reserved=0,
                )
                session.add(child)
                await session.flush()
                product_id_to_first_child_id[p.id] = child.id
            else:
                for idx, (size_value, barcode, qty) in enumerate(children_spec):
                    child_code = f"{settings.CHILD_CODE_PREFIX}{p_id_snippet}-{idx + 1}{settings.CHILD_CODE_SUFFIX}"
                    child = ProductChild(
                        product_id=p.id,
                        code=child_code,
                        barcode=barcode,
                        size_value=size_value,
                        stock_quantity=qty,
                        stock_reserved=0,
                    )
                    session.add(child)
                    await session.flush()
                    if idx == 0:
                        product_id_to_first_child_id[p.id] = child.id
            session.add(ProductTranslation(product_id=p.id, language_id=langs["ar"].id, name=name_ar, description=desc_ar))

            # Attribute options
            if cat_id and attr_pairs:
                for attr_name, opt_val in attr_pairs:
                    r = await session.execute(
                        select(TaxonomyAttributeOption.id)
                        .join(TaxonomyAttribute, TaxonomyAttributeOption.attribute_id == TaxonomyAttribute.id)
                        .where(TaxonomyAttribute.taxonomy_id == cat_id)
                        .where(TaxonomyAttribute.name == attr_name)
                        .where(TaxonomyAttributeOption.value == opt_val)
                    )
                    row = r.first()
                    if row:
                        session.add(ProductAttributeValue(product_id=p.id, option_id=row[0]))
        await session.commit()

        # 7. UI strings
        print("Seeding UI strings...")
        for code, strings in UI_STRINGS.items():
            lang = langs.get(code)
            if lang:
                for key, value in strings.items():
                    session.add(UIString(key=key, language_id=lang.id, value=value))
        await session.commit()

        # 8. Sample customers, addresses, orders, and reviews
        print("Seeding sample customers, addresses, orders, and reviews...")
        customer_pw = get_password_hash("customer123")
        sample_users: list[User] = []
        for i in range(1, 5):
            u = User(
                email=f"customer{i}@example.com",
                password_hash=customer_pw,
                full_name=f"Customer {i}",
                is_active=True,
                is_superuser=False,
                role="customer",
            )
            session.add(u)
            await session.flush()
            sample_users.append(u)

        # Addresses: 1-2 per customer
        addr_data = [
            ("Home", "home", "Villa 12, Palm Jumeirah", "Dubai", "United Arab Emirates"),
            ("Office", "office", "Level 15, DIFC Gate Ave", "Dubai", "United Arab Emirates"),
        ]
        addr_by_user: dict[int, list[CustomerAddress]] = {}
        for u in sample_users:
            addrs = []
            for j, (label, addr_type, street, city, country) in enumerate(addr_data[: (2 if u.id % 2 == 0 else 1)]):
                ca = CustomerAddress(
                    user_id=u.id,
                    contact_name=u.full_name or f"Customer {u.id}",
                    phone="+97150123456" + str(u.id),
                    address_type=addr_type,
                    street=street,
                    city=city,
                    country=country,
                    is_default=(j == 0),
                )
                session.add(ca)
                await session.flush()
                addrs.append(ca)
            addr_by_user[u.id] = addrs
        await session.commit()

        # Products with first child id for order items (need product id, child id, price)
        r = await session.execute(select(Product.id, Product.slug, Product.price).where(Product.is_active == True))
        products_list = list(r.all())
        # Build (product_id, product_child_id, slug, price) for orders
        products_with_child = [
            (pid, product_id_to_first_child_id[pid], slug, price)
            for pid, slug, price in products_list
            if pid in product_id_to_first_child_id
        ]

        # Orders: 3-5 per customer
        order_counter = 0
        all_order_items: list[tuple[OrderItem, int, str]] = []  # (item, user_id, product_id) for reviews
        for u in sample_users:
            addrs = addr_by_user.get(u.id, [])
            ship_str = addrs[0].to_shipping_string() if addrs else "Dubai, UAE"
            n_orders = random.randint(3, 5)
            for _ in range(n_orders):
                order_counter += 1
                ord_num = f"ORD-{order_counter:05d}"
                n_items = min(random.randint(1, 3), len(products_with_child))
                chosen = random.sample(products_with_child, n_items)
                total = 0.0
                items_data = []
                for idx, (pid, child_id, _, price) in enumerate(chosen):
                    qty = random.randint(1, 2)
                    total += price * qty
                    items_data.append((idx + 1, pid, child_id, qty, price))
                ord_obj = Order(
                    order_number=ord_num,
                    user_id=u.id,
                    status="paid",
                    total_amount=round(total, 2),
                    shipping_address=ship_str,
                )
                session.add(ord_obj)
                await session.flush()
                for idx, pid, child_id, qty, price in items_data:
                    oi = OrderItem(
                        order_id=ord_obj.id,
                        order_item_number=idx,
                        product_id=pid,
                        product_child_id=child_id,
                        quantity=qty,
                        price_at_purchase=price,
                        status=random.choice(["pending", "shipped", "delivered"]),
                    )
                    session.add(oi)
                    await session.flush()
                    all_order_items.append((oi, u.id, pid))
        await session.commit()

        # Product reviews: add reviews for some order items (each order_item_id is unique)
        review_comments = [
            ("Great product, exactly as described!", "منتج رائع كما هو موصوف!"),
            ("Fast shipping. Happy with purchase.", "شحن سريع. راضٍ عن الشراء."),
            ("Good value for money.", "قيمة جيدة مقابل المال."),
            ("Would buy again.", "سأشتري مرة أخرى."),
        ]
        reviewed_oi_ids: set[int] = set()
        for oi, uid, pid in all_order_items:
            if random.random() < 0.35 and oi.id not in reviewed_oi_ids:
                reviewed_oi_ids.add(oi.id)
                en_cmt, ar_cmt = random.choice(review_comments)
                session.add(
                    ProductReview(
                        order_item_id=oi.id,
                        product_id=pid,
                        user_id=uid,
                        rating=random.randint(4, 5),
                        comment=en_cmt,
                    )
                )
        await session.commit()

    print("Done. Admin: admin@example.com / admin123")
    print("Sample customers: customer1@example.com ... customer4@example.com / customer123")


if __name__ == "__main__":
    asyncio.run(reset_and_seed())
