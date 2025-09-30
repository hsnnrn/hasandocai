#!/usr/bin/env python3
"""
Simple test script to check if BGE-M3 model works
"""

import sys
import traceback

def test_imports():
    """Test if all required packages can be imported"""
    try:
        print("Testing imports...")
        import torch
        print(f"✓ PyTorch {torch.__version__}")
        
        import numpy as np
        print(f"✓ NumPy {np.__version__}")
        
        from FlagEmbedding import BGEM3FlagModel
        print("✓ FlagEmbedding imported successfully")
        
        return True
    except Exception as e:
        print(f"✗ Import error: {e}")
        traceback.print_exc()
        return False

def test_model_loading():
    """Test if BGE-M3 model can be loaded"""
    try:
        print("\nTesting model loading...")
        from FlagEmbedding import BGEM3FlagModel
        
        print("Loading BGE-M3 model (this may take a few minutes)...")
        model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=False)
        print("✓ Model loaded successfully!")
        
        # Test embedding generation
        print("Testing embedding generation...")
        test_texts = ["Hello world", "This is a test"]
        embeddings = model.encode(test_texts, return_dense=True, return_sparse=False, return_colbert_vecs=False)
        
        if isinstance(embeddings, dict) and 'dense_vecs' in embeddings:
            embeddings = embeddings['dense_vecs']
        
        print(f"✓ Generated embeddings with shape: {len(embeddings)} x {len(embeddings[0])}")
        print("✓ BGE-M3 model is working correctly!")
        
        return True
    except Exception as e:
        print(f"✗ Model loading error: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=== BGE-M3 Model Test ===")
    
    # Test imports
    if not test_imports():
        print("\n❌ Import test failed!")
        sys.exit(1)
    
    # Test model loading
    if not test_model_loading():
        print("\n❌ Model test failed!")
        sys.exit(1)
    
    print("\n✅ All tests passed! BGE-M3 model is working correctly.")
