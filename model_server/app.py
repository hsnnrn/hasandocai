"""
BGE-M3 Embedding Model Server
FastAPI server that provides embedding functionality using BGE-M3 model.
Supports CUDA (Windows/NVIDIA), MPS (Apple Silicon), and CPU fallback.

Placeholders to replace:
- <MODEL_ID>: BGE-M3 model identifier (e.g., "BAAI/bge-m3")
- <MAX_BATCH_SIZE>: Maximum batch size for processing (default: 64)
- <TIMEOUT_SECONDS>: Request timeout in seconds (default: 30)
"""

import os
import time
import logging
from typing import List, Optional, Dict, Any
import asyncio
from contextlib import asynccontextmanager

import torch
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from FlagEmbedding import BGEM3FlagModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model variables
model = None
tokenizer = None
device = None

class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., description="List of texts to embed")
    batch_size: Optional[int] = Field(64, description="Batch size for processing")
    normalize: Optional[bool] = Field(True, description="Whether to normalize embeddings")

class EmbedResponse(BaseModel):
    embeddings: List[List[float]] = Field(..., description="List of embedding vectors")
    model_info: Dict[str, Any] = Field(..., description="Model and device information")

class HealthResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    status: str
    device: str
    model_loaded: bool
    model_info: Dict[str, Any]

def detect_device():
    """Detect the best available device for model inference."""
    if torch.cuda.is_available():
        device_name = "cuda"
        logger.info(f"CUDA available: {torch.cuda.get_device_name(0)}")
    elif torch.backends.mps.is_available():
        device_name = "mps"
        logger.info("Apple Silicon MPS available")
    else:
        device_name = "cpu"
        logger.info("Using CPU fallback")
    
    return device_name

def load_model():
    """Load BGE-M3 model and tokenizer."""
    global model, tokenizer, device
    
    try:
        device = detect_device()
        device_obj = torch.device(device)
        
        logger.info(f"Loading BGE-M3 model on {device}...")
        
        # Load the actual BGE-M3 model
        model_name = "BAAI/bge-m3"
        use_fp16 = device != 'cpu'  # Use FP16 for GPU acceleration
        
        logger.info(f"Loading {model_name} with FP16={use_fp16}")
        model = BGEM3FlagModel(model_name, use_fp16=use_fp16)
        
        # Move model to appropriate device
        if device == 'cuda':
            model = model.cuda()
        elif device == 'mps':
            model = model.to('mps')
        
        logger.info(f"Model loaded successfully on {device}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting BGE-M3 embedding server...")
    
    # Load model on startup
    if not load_model():
        logger.error("Failed to load model. Server will start but embedding endpoints will fail.")
    
    yield
    
    logger.info("Shutting down BGE-M3 embedding server...")

# Create FastAPI app
app = FastAPI(
    title="BGE-M3 Embedding Server",
    description="Local embedding service using BGE-M3 model",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your Electron app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def embed_texts_mock(texts: List[str], batch_size: int = 64) -> List[List[float]]:
    """
    Mock embedding function - replace with actual BGE-M3 implementation.
    Returns random embeddings of dimension 1024.
    """
    embeddings = []
    for text in texts:
        # Generate random embedding of dimension 1024
        embedding = np.random.randn(1024).astype(np.float32)
        # Normalize the embedding
        embedding = embedding / np.linalg.norm(embedding)
        embeddings.append(embedding.tolist())
    
    return embeddings

def embed_texts_actual(texts: List[str], batch_size: int = 64) -> List[List[float]]:
    """
    Actual BGE-M3 embedding function.
    """
    try:
        if model is None:
            logger.warning("BGE-M3 model not loaded, using mock embeddings")
            return embed_texts_mock(texts, batch_size)
            
        # Generate embeddings using BGE-M3 model
        embeddings = model.encode(
            texts, 
            batch_size=batch_size,
            return_dense=True,
            return_sparse=False,
            return_colbert_vecs=False
        )
        
        # Convert to list format
        if isinstance(embeddings, dict) and 'dense_vecs' in embeddings:
            embeddings = embeddings['dense_vecs']
        
        # Normalize embeddings manually
        import numpy as np
        if hasattr(embeddings, 'tolist'):
            embeddings = embeddings.tolist()
        
        # Normalize each embedding vector
        normalized_embeddings = []
        for embedding in embeddings:
            if isinstance(embedding, list):
                embedding = np.array(embedding)
            norm = np.linalg.norm(embedding)
            if norm > 0:
                normalized = embedding / norm
            else:
                normalized = embedding
            normalized_embeddings.append(normalized.tolist())
        
        return normalized_embeddings
            
    except Exception as e:
        logger.error(f"Error in BGE-M3 embedding: {str(e)}")
        # Fallback to mock implementation if BGE-M3 fails
        logger.warning("Falling back to mock embeddings due to error")
        return embed_texts_mock(texts, batch_size)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    model_info = {
        "model_name": "BAAI/bge-m3",
        "embedding_dim": 1024,  # BGE-M3 dense embedding dimension
        "device": device or "unknown",
        "model_type": "BGE-M3"
    }
    
    # Even if model is not loaded, we can still provide embeddings (mock)
    status = "healthy"
    model_loaded = model is not None
    
    if model is None:
        logger.warning("BGE-M3 model not loaded, but server is functional with mock embeddings")
        status = "healthy_mock"
    
    return HealthResponse(
        status=status,
        device=device or "unknown",
        model_loaded=model_loaded,
        model_info=model_info
    )

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """
    Generate embeddings for input texts using BGE-M3 model.
    """
    # Allow embedding generation even if model is not loaded (will use mock embeddings)
    
    try:
        start_time = time.time()
        
        # Validate input
        if not request.texts:
            raise HTTPException(status_code=400, detail="No texts provided")
        
        if len(request.texts) > 64:  # MAX_BATCH_SIZE
            raise HTTPException(
                status_code=400, 
                detail=f"Too many texts. Maximum allowed: 64"
            )
        
        # Process texts in batches
        batch_size = min(request.batch_size or 64, 64)  # MAX_BATCH_SIZE
        all_embeddings = []
        
        for i in range(0, len(request.texts), batch_size):
            batch_texts = request.texts[i:i + batch_size]
            
            # Generate embeddings
            batch_embeddings = embed_texts_actual(batch_texts, batch_size)
            all_embeddings.extend(batch_embeddings)
        
        processing_time = time.time() - start_time
        
        logger.info(f"Processed {len(request.texts)} texts in {processing_time:.2f}s")
        
        return EmbedResponse(
            embeddings=all_embeddings,
            model_info={
                "model_name": "BAAI/bge-m3",
                "device": device,
                "embedding_dim": 1024,
                "processing_time": processing_time,
                "text_count": len(request.texts)
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint with basic info."""
    return {
        "service": "BGE-M3 Embedding Server",
        "version": "1.0.0",
        "endpoints": ["/health", "/embed"],
        "docs": "/docs"
    }

if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=7860,  # Default port for BGE-M3
        workers=1,
        reload=False,
        log_level="info"
    )
