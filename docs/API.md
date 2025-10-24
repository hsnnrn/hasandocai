# API Documentation

## 🔌 REST API

DocDataApp provides a REST API for programmatic access to document processing and analysis features.

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All API requests require authentication using API keys or JWT tokens.

```bash
# Using API Key
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/v1/documents

# Using JWT Token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/v1/documents
```

## 📄 Document Endpoints

### Upload Document
Upload a new document for processing.

```http
POST /api/v1/documents
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "file": "document.pdf",
  "metadata": {
    "title": "Sample Document",
    "tags": ["important", "contract"],
    "folder": "contracts"
  }
}
```

**Response:**
```json
{
  "id": "doc_123456789",
  "status": "processing",
  "filename": "document.pdf",
  "size": 1024000,
  "uploaded_at": "2024-01-15T10:30:00Z",
  "processing_status": "queued"
}
```

### Get Document
Retrieve document information and content.

```http
GET /api/v1/documents/{document_id}
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "id": "doc_123456789",
  "filename": "document.pdf",
  "title": "Sample Document",
  "content": "Extracted text content...",
  "metadata": {
    "pages": 10,
    "word_count": 2500,
    "language": "en",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "analysis": {
    "summary": "Document summary...",
    "keywords": ["keyword1", "keyword2"],
    "sentiment": "positive",
    "confidence": 0.95
  }
}
```

### List Documents
Get a list of all documents with optional filtering.

```http
GET /api/v1/documents?page=1&limit=20&folder=contracts&tags=important
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `folder`: Filter by folder name
- `tags`: Filter by tags (comma-separated)
- `search`: Search in content and metadata
- `sort`: Sort field (created_at, title, size)
- `order`: Sort order (asc, desc)

**Response:**
```json
{
  "documents": [
    {
      "id": "doc_123456789",
      "filename": "document.pdf",
      "title": "Sample Document",
      "size": 1024000,
      "created_at": "2024-01-15T10:30:00Z",
      "tags": ["important", "contract"],
      "folder": "contracts"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Update Document
Update document metadata and properties.

```http
PUT /api/v1/documents/{document_id}
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "title": "Updated Document Title",
  "tags": ["updated", "important"],
  "folder": "new_folder"
}
```

### Delete Document
Delete a document and all associated data.

```http
DELETE /api/v1/documents/{document_id}
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "message": "Document deleted successfully",
  "id": "doc_123456789"
}
```

## 🔍 Analysis Endpoints

### Analyze Document
Trigger AI analysis for a specific document.

```http
POST /api/v1/documents/{document_id}/analyze
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "analysis_type": "full",
  "options": {
    "include_summary": true,
    "include_keywords": true,
    "include_sentiment": true,
    "include_classification": true
  }
}
```

**Response:**
```json
{
  "analysis_id": "analysis_123456789",
  "status": "processing",
  "estimated_completion": "2024-01-15T10:35:00Z"
}
```

### Get Analysis Results
Retrieve analysis results for a document.

```http
GET /api/v1/documents/{document_id}/analysis
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "id": "analysis_123456789",
  "status": "completed",
  "results": {
    "summary": "This document discusses...",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "sentiment": {
      "overall": "positive",
      "confidence": 0.85,
      "scores": {
        "positive": 0.7,
        "neutral": 0.2,
        "negative": 0.1
      }
    },
    "classification": {
      "category": "legal",
      "confidence": 0.92,
      "subcategories": ["contract", "agreement"]
    },
    "entities": [
      {
        "text": "John Doe",
        "type": "person",
        "confidence": 0.95
      }
    ]
  },
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:00Z"
}
```

### Batch Analysis
Analyze multiple documents in batch.

```http
POST /api/v1/analysis/batch
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "document_ids": ["doc_123", "doc_456", "doc_789"],
  "analysis_type": "full",
  "options": {
    "include_summary": true,
    "include_keywords": true,
    "include_sentiment": true
  }
}
```

## 🔎 Search Endpoints

### Search Documents
Search documents by content, metadata, or AI analysis.

```http
POST /api/v1/search
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "query": "contract terms",
  "filters": {
    "folders": ["contracts"],
    "tags": ["important"],
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  },
  "options": {
    "semantic_search": true,
    "include_content": true,
    "highlight": true
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "document": {
        "id": "doc_123456789",
        "filename": "contract.pdf",
        "title": "Service Agreement",
        "folder": "contracts",
        "tags": ["important", "legal"]
      },
      "relevance_score": 0.95,
      "highlights": [
        {
          "field": "content",
          "text": "...contract terms and conditions...",
          "position": 150
        }
      ],
      "matched_content": "The contract terms specify..."
    }
  ],
  "total_results": 25,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

## 📊 Analytics Endpoints

### Get Usage Statistics
Retrieve application usage statistics.

```http
GET /api/v1/analytics/usage
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "documents": {
    "total": 150,
    "processed": 145,
    "pending": 5
  },
  "storage": {
    "total_size": 1024000000,
    "used_size": 512000000,
    "available_size": 512000000
  },
  "analysis": {
    "total_analyses": 200,
    "successful": 195,
    "failed": 5,
    "average_processing_time": 30.5
  },
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

### Get Performance Metrics
Retrieve system performance metrics.

```http
GET /api/v1/analytics/performance
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "processing": {
    "average_time": 30.5,
    "success_rate": 0.975,
    "queue_length": 3
  },
  "ai_services": {
    "response_time": 2.1,
    "accuracy": 0.92,
    "uptime": 0.99
  },
  "system": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "disk_usage": 23.5
  }
}
```

## 🔧 Configuration Endpoints

### Get Configuration
Retrieve current application configuration.

```http
GET /api/v1/config
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "ai_services": {
    "provider": "openai",
    "model": "gpt-4",
    "api_key_configured": true
  },
  "storage": {
    "location": "/path/to/storage",
    "max_size": 1073741824,
    "encryption_enabled": true
  },
  "processing": {
    "batch_size": 10,
    "timeout": 300,
    "retry_attempts": 3
  }
}
```

### Update Configuration
Update application configuration.

```http
PUT /api/v1/config
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "ai_services": {
    "provider": "openai",
    "model": "gpt-4"
  },
  "processing": {
    "batch_size": 20,
    "timeout": 600
  }
}
```

## 🔔 Webhook Endpoints

### Register Webhook
Register a webhook for event notifications.

```http
POST /api/v1/webhooks
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["document.processed", "analysis.completed"],
  "secret": "your_webhook_secret"
}
```

**Response:**
```json
{
  "id": "webhook_123456789",
  "url": "https://your-app.com/webhook",
  "events": ["document.processed", "analysis.completed"],
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### List Webhooks
Get all registered webhooks.

```http
GET /api/v1/webhooks
Authorization: Bearer YOUR_API_KEY
```

### Delete Webhook
Remove a webhook.

```http
DELETE /api/v1/webhooks/{webhook_id}
Authorization: Bearer YOUR_API_KEY
```

## 📝 Error Handling

### Error Response Format
All API errors follow a consistent format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": {
      "field": "document_id",
      "reason": "Document not found"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456789"
  }
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Rate Limited
- `500`: Internal Server Error

### Rate Limiting
API requests are rate limited:
- **Free tier**: 100 requests/hour
- **Pro tier**: 1000 requests/hour
- **Enterprise**: Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 🔐 Authentication

### API Key Authentication
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/v1/documents
```

### JWT Token Authentication
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/v1/documents
```

### OAuth 2.0 (Future)
OAuth 2.0 support is planned for future releases.

## 📚 SDKs and Libraries

### JavaScript/Node.js
```bash
npm install docdataapp-sdk
```

```javascript
const DocDataApp = require('docdataapp-sdk');

const client = new DocDataApp({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'http://localhost:3000/api/v1'
});

// Upload document
const document = await client.documents.upload({
  file: 'document.pdf',
  metadata: {
    title: 'Sample Document',
    tags: ['important']
  }
});

// Analyze document
const analysis = await client.documents.analyze(document.id, {
  analysis_type: 'full'
});
```

### Python
```bash
pip install docdataapp-sdk
```

```python
from docdataapp import Client

client = Client(
    api_key='YOUR_API_KEY',
    base_url='http://localhost:3000/api/v1'
)

# Upload document
document = client.documents.upload(
    file='document.pdf',
    metadata={
        'title': 'Sample Document',
        'tags': ['important']
    }
)

# Analyze document
analysis = client.documents.analyze(
    document_id=document.id,
    analysis_type='full'
)
```

## 🧪 Testing

### Test Environment
Use the test environment for development:
```
https://api-test.docdataapp.com/api/v1
```

### Postman Collection
Download our Postman collection for easy API testing:
[Download Collection](https://docs.docdataapp.com/postman-collection.json)

### API Testing Tools
- **Postman**: Import collection and test endpoints
- **Insomnia**: REST client for API testing
- **curl**: Command-line testing
- **HTTPie**: User-friendly command-line client

---

**Note**: This API documentation is regularly updated. For the latest information, visit our [official documentation](https://docs.docdataapp.com/api).
