import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=== Testing E-commerce API Authentication ===\n")

# Test 1: Signup
print("1. Testing Signup...")
signup_data = {
    "email": "testuser@example.com",
    "password": "secure123",
    "full_name": "Test User"
}
try:
    response = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")
except Exception as e:
    print(f"Error: {e}\n")

# Test 2: Login
print("2. Testing Login...")
login_data = {
    "email": "testuser@example.com",
    "password": "secure123"
}
try:
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}\n")
    token = result.get("access_token")
except Exception as e:
    print(f"Error: {e}\n")
    token = None

# Test 3: Get Current User (Protected)
print("3. Testing Get Current User (Protected Route)...")
if token:
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{BASE_URL}/users/me", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}\n")
    except Exception as e:
        print(f"Error: {e}\n")
else:
    print("No token available\n")

# Test 4: Test without token (should fail)
print("4. Testing Protected Route Without Token (Should Fail)...")
try:
    response = requests.get(f"{BASE_URL}/users/me")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")
except Exception as e:
    print(f"Error: {e}\n")

print("=== Tests Complete ===")
