import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

print("=== Testing E-commerce API Products (CRUD) ===\n")

# 1. Login as Admin (WE NEED TO CREATE ONE FIRST IF NOT EXISTS)
# For this test, let's create a new admin user first
print("1. Creating Admin User...")
admin_email = "admin@example.com"
admin_password = "adminpass123"

# Try signup (might already exist)
signup_data = {
    "email": admin_email,
    "password": admin_password,
    "full_name": "Admin User"
}

try:
    response = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
    if response.status_code == 201:
        print("Admin user created.")
    elif response.status_code == 400:
        print("Admin user already exists.")
    else:
        print(f"Error creating admin: {response.text}")
except Exception as e:
    print(f"Connection error: {e}")
    sys.exit(1)

# Login to get token
print("2. Logging in...")
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
        sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}"}

# NOTE: In a real scenario, we would need to manually update the DB to make this user an admin.
# Since we don't have a direct DB shell here easily, code normally assumes we have a way to seed admins.
# BUT app/api/endpoints/products.py requires `get_current_admin_user` which checks `is_superuser`.
# We need to hack this for the test or update the user in DB directly? 
# Actually, let's use a workaround: The `signup` creates a normal user.
# For this test script to work fully, we need to verify public read access first, 
# and expect 403 Forbidden for write operations if the user is not admin.

# 3. Create Product (Expect 403 if not admin)
print("\n3. Testing Create Product (As Normal User - Should Fail/Forbidden)...")
product_data = {
    "name": "Test Phone",
    "description": "A great phone",
    "price": 999.99,
    "stock_quantity": 10,
    "image_url": "http://example.com/phone.jpg",
    "category": "Electronics"
}
response = requests.post(f"{BASE_URL}/products/", json=product_data, headers=headers)
print(f"Status: {response.status_code}") # Should be 403
print(f"Response: {response.text}")

# 4. List Products (Public)
print("\n4. Testing List Products (Public)...")
response = requests.get(f"{BASE_URL}/products/")
print(f"Status: {response.status_code}")
print(f"Products found: {len(response.json())}")

# 5. Get Single Product (Public)
# If list is empty, we can't test this easily without seeding DB.
if len(response.json()) > 0:
    pid = response.json()[0]['id']
    print(f"\n5. Testing Get Product {pid}...")
    response = requests.get(f"{BASE_URL}/products/{pid}")
    print(f"Status: {response.status_code}")
    print(f"Name: {response.json().get('name')}")

print("\n=== Tests Complete ===")
