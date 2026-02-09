#!/bin/bash

echo "=== Testing E-commerce API Authentication ==="
echo ""

# Test 1: Signup
echo "1. Testing Signup..."
SIGNUP_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "password": "secure123", "full_name": "Test User"}')
echo "$SIGNUP_RESPONSE"
echo ""

# Test 2: Login
echo "2. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "password": "secure123"}')
echo "$LOGIN_RESPONSE"
echo ""

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo ""

# Test 3: Get Current User
echo "3. Testing Get Current User (Protected Route)..."
if [ -n "$TOKEN" ]; then
    USER_RESPONSE=$(curl -s -X GET http://127.0.0.1:8000/users/me \
      -H "Authorization: Bearer $TOKEN")
    echo "$USER_RESPONSE"
else
    echo "No token available"
fi
echo ""

echo "=== Tests Complete ==="
