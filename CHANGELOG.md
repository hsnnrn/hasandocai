# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added - Mistral RAG Chatbot (feature/mistral-chatbot-rag)

#### Core Features
- **AI Chat Controller** (`src/main/ai/chatController.ts`) - Main orchestrator for RAG pipeline
- **Mistral Client** (`src/main/ai/mistralClient.ts`) - Local Mistral 7B integration with Ollama support
- **BGE-M3 Embed Client** (`src/main/ai/embedClient.ts`) - Query embedding generation wrapper
- **Retrieval Client** (`src/main/ai/retrievalClient.ts`) - Dual vector DB support (pgvector/Qdrant)
- **Numeric Extractor** (`src/main/ai/numericExtractor.ts`) - Deterministic extraction of amounts, dates, invoice IDs
- **Aggregator** (`src/main/ai/aggregator.ts`) - Backend statistical calculations (sum, avg, median, dedupe)

#### UI Components
- **ChatBot Component** (`src/renderer/src/components/ChatBot/ChatBot.tsx`) - React chat interface
  - Message history with user/assistant roles
  - Stats display (count, sum, average, median)
  - Provenance viewer (show sources)
  - Health status indicators for BGE-M3 and Mistral
  - Low confidence warnings
  - Follow-up suggestions

#### IPC & Communication
- New IPC handlers in `src/main/ipc-handlers.ts`:
  - `ai:initializeChatController` - Initialize chat system
  - `ai:chatQuery` - Process user queries
  - `ai:healthCheck` - Check AI services status
- Updated `src/main/preload.ts` with `aiAPI` namespace
- Type definitions for all IPC responses

#### Testing
- **numericExtractor tests** (`tests/numericExtractor.test.ts`)
  - Turkish number format (1.234,56)
  - US number format (1,234.56)
  - Currency detection (TRY, USD, EUR)
  - Date parsing (DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY)
  - Invoice ID patterns
  - Edge cases (negatives, large numbers, mixed content)
- **Aggregator tests** (`tests/aggregator.test.ts`)
  - Deduplication logic
  - Statistical calculations
  - Currency grouping
  - Median calculation (even/odd counts)
  - Variance and standard deviation

#### Database
- **pgvector function** (`sql/pgvector_match_embeddings.sql`)
  - Semantic search with cosine similarity
  - Configurable threshold and top-K
  - Optimized with ivfflat index

#### Documentation
- **Setup Guide** (`README-chatbot.md`)
  - Quick start instructions
  - Ollama, Docker, and llama.cpp options for Mistral
  - Environment variable configuration
  - Supabase and Qdrant setup
  - Testing and benchmarking
  - Troubleshooting guide
  - Example queries

### Technical Details

#### Architecture
- **Pipeline**: Query → Embed → Retrieve → Extract → Aggregate → Format → Response
- **Correctness First**: Backend performs all numeric calculations (not LLM)
- **Local-First**: 100% local processing, no cloud dependencies
- **Fallback Support**: Works even if Mistral server is down

#### Performance Targets
- Total latency: < 2.5s per query
- Embedding: < 100ms
- Retrieval: < 500ms (50 chunks)
- Extraction + Aggregation: < 100ms
- Mistral formatting: < 2s

#### Locale Support
- Turkish number format (1.234,56)
- Turkish currency (TL, TRY, ₺)
- Turkish date format (DD.MM.YYYY)
- US format fallback

### Changed
- Updated `src/main/ipc-handlers.ts` with AI chat handlers
- Extended `src/main/preload.ts` type definitions

### Fixed
- N/A (new feature)

---

## Previous Versions
See git history for earlier changes.

