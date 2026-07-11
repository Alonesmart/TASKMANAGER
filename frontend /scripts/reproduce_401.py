import requests

BASE_URL = "http://127.0.0.1:8000"

def test_unauthorized():
    # Test without token
    print("Testing without token...")
    resp = requests.get(f"{BASE_URL}/users/me")
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.json()}")

    # Test with invalid token
    print("\nTesting with invalid token...")
    headers = {"Authorization": "Bearer invalid_token"}
    resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.json()}")

if __name__ == "__main__":
    test_unauthorized()
