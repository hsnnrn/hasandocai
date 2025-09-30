#!/usr/bin/env python3
"""
Test script to check if the API server is working
"""

import requests
import json

def test_health():
    """Test health endpoint"""
    try:
        print("Testing health endpoint...")
        response = requests.get("http://127.0.0.1:7861/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health test failed: {e}")
        return False

def test_embedding():
    """Test embedding endpoint"""
    try:
        print("\nTesting embedding endpoint...")
        data = {
            "texts": ["Hello world", "This is a test"],
            "batch_size": 2
        }
        response = requests.post(
            "http://127.0.0.1:7861/embed", 
            json=data, 
            timeout=30
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Generated {len(result['embeddings'])} embeddings")
            print(f"Embedding dimension: {len(result['embeddings'][0])}")
            print("✓ Embedding test successful!")
            return True
        else:
            print(f"✗ Embedding test failed: {response.text}")
            return False
    except Exception as e:
        print(f"Embedding test failed: {e}")
        return False

if __name__ == "__main__":
    print("=== API Server Test ===")
    
    # Test health
    if not test_health():
        print("❌ Health test failed!")
        exit(1)
    
    # Test embedding
    if not test_embedding():
        print("❌ Embedding test failed!")
        exit(1)
    
    print("\n✅ All API tests passed!")
