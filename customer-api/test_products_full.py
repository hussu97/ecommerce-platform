import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

print("=== Testing E-commerce API Products (CRUD) ===\n")

admin_email = "admin@example.com"
admin_password = "adminpass123"

# 1. Login (User should verify they exist first, but assuming previous test ran)
print("1. Logging in...")
login_data = {
    "email": admin_email,
    "password": admin_password
}
token = None
try:
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        token = response.json().get("access_token")
        print("Login successful.")
    else:
        print(f"Login failed: {response.text}")
        # Try creating if login failed (maybe first run)
        print("Attempting to create user...")
        signup_data = {"email": admin_email, "password": admin_password, "full_name": "Admin User"}
        requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
             token = response.json().get("access_token")
             print("Created and Logged in.")
        else:
             sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}"}

# 2. Create Product (Should SUCCEED now if make_admin.py ran)
print("\n2. Testing Create Product (As Admin)...")
product_data = {
    "name": "Test Phone",
    "description": "A great phone",
    "price": 999.99,
    "stock_quantity": 10,
    "image_url": "http://example.com/phone.jpg",
    "category": "Electronics"
}
response = requests.post(f"{BASE_URL}/products/", json=product_data, headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 201:
    print("Product created successfully.")
    product_id = response.json()['id']
else:
    print(f"Failed to create product: {response.text}")
    sys.exit(1)

# 3. List Products
print("\n3. Testing List Products...")
response = requests.get(f"{BASE_URL}/products/")
print(f"Status: {response.status_code}")
products = response.json()
print(f"Products found: {len(products)}")

# 4. Update Product
print(f"\n4. Testing Update Product {product_id}...")
update_data = {"price": 899.99}
response = requests.put(f"{BASE_URL}/products/{product_id}", json=update_data, headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200 and response.json()['price'] == 899.99:
    print("Product updated successfully.")
else:
    print(f"Update failed: {response.text}")

# 5. Delete Product
print(f"\n5. Testing Delete (Soft) Product {product_id}...")
response = requests.delete(f"{BASE_URL}/products/{product_id}", headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200 and response.json()['is_active'] == False:
    print("Product deleted (soft) successfully.")
else:
    print(f"Delete failed: {response.text}")

print("\n=== Tests Complete ===")
