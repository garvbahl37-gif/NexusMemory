---
title: Nexus Memory Backend
emoji: 🧠
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Nexus Memory

> A local AI assistant that **remembers you**, answers questions from your **documents**, and runs **entirely on your machine** — no cloud, no subscriptions, no data leaving your device.

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![LangChain](https://img.shields.io/badge/LangChain-0.2-1C3C3C?style=flat-square&logo=langchain&logoColor=white)](https://langchain.com)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-black?style=flat-square)](https://ollama.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6B35?style=flat-square)](https://trychroma.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**[Features](#-features) • [Architecture](#-architecture) • [Setup](#-setup) • [Usage](#-usage) • [API](#-api-reference) • [Tech Stack](#-tech-stack)**

</div>

---

## What Is Nexus Memory?

Nexus Memory is a **production-inspired local AI assistant** built to demonstrate practical AI engineering skills. Unlike generic chatbots, Nexus Memory:

- **Remembers facts about you** across conversations using semantic memory extraction
- **Reads your documents** and answers questions using RAG (Retrieval-Augmented Generation)
- **Runs 100% locally** via Ollama — your data never leaves your machine
- **Streams responses** in real-time just like ChatGPT
- **Persists everything** in SQLite + ChromaDB for long-term use

Built in one day as a focused demonstration of modern AI engineering — clean architecture, practical tooling, and shipping ability.

---

## Features

### Conversational Chat

- ChatGPT-style streaming interface with real-time token rendering
- Markdown rendering with code blocks, tables, and formatting
- Multi-turn conversation with full history persistence
- Multiple chat sessions with sidebar navigation
- Copy message button on every bubble
- Typing indicator during response generation

### Persistent Memory System

- **Automatic memory extraction** — AI identifies and stores important facts from your conversation
- **Semantic memory retrieval** — finds relevant memories using vector similarity search
- **Memory panel** — view, add, and delete memories with category badges
- **Memory badges** on responses showing how many memories were used
- Categories: `technical`, `professional`, `preference`, `goal`, `general`
- Backed by SQLite (structured) + ChromaDB (semantic search)

### PDF / Document Chat (RAG)

- Upload **PDF**, **TXT**, and **Markdown** files
- Automatic text extraction and intelligent chunking
- Semantic embeddings via `nomic-embed-text`
- MMR (Maximum Marginal Relevance) retrieval for diverse, relevant results
- Source-aware answers with document chunk badges
- Multi-document support — query across multiple files simultaneously

### Local LLM Integration

- Powered by **Ollama** — runs llama3, mistral, and any installed model
- Live model selector dropdown — switch models mid-conversation
- No API keys, no rate limits, no cloud dependency
- Streaming responses via Server-Sent Events (SSE)

### Modern Dark UI

- Clean dark theme with indigo/purple accent colors
- Smooth Framer Motion animations throughout
- Responsive sidebar with collapsible panel
- Drag-and-drop file upload with progress tracking
- Memory side panel with live count badge

---
<p float="left" align="center">
  <img src="screenshots/Screenshot 2026-05-28 at 3.54.55 PM.png" width="100%" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <br><br>
  <img src="screenshots/Screenshot 2026-05-28 at 3.43.58 PM.png" width="100%" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <br><br>
  <img src="screenshots/Screenshot 2026-05-28 at 3.53.43 PM.png" width="100%" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <br><br>
  <img src="screenshots/Screenshot 2026-05-28 at 3.54.37 PM.png" width="100%" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <br><br>
  <img src="screenshots/Screenshot 2026-05-28 at 3.54.05 PM.png" width="100%" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <br><br>
</p>


## Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        NEXUS MEMORY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   FRONTEND (React + Vite)                │  │
│   │                                                          │  │
│   │  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐  │  │
│   │  │ Sidebar  │  │ ChatWindow │  │   MemoryPanel        │  │  │
│   │  │ Sessions │  │ Messages   │  │   Brain Icon Panel   │  │  │
│   │  │ Memory   │  │ Streaming  │  │   Add/Delete Memory  │  │  │
│   │  │ Tab      │  │ Markdown   │  │                      │  │  │
│   │  └──────────┘  └────────────┘  └──────────────────────┘  │  │
│   │                                                          │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│   │  │UploadSection │  │ModelSelector │  │ MessageBubble│    │  │
│   │  │ Drag & Drop  │  │ Live Models  │  │ Badges+Copy  │    │  │
│   │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│   └─────────────────────────┬────────────────────────────────┘  │
│                             │ HTTP / SSE                        │
│                             ▼                                   │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                 BACKEND (FastAPI + Python)               │  │
│   │                                                          │  │
│   │  POST /chat          GET /chat/sessions                  │  │
│   │  POST /upload        GET /memory/{session_id}            │  │
│   │  POST /memory        DELETE /memory/{id}                 │  │
│   │  GET  /health        DELETE /documents/{id}              │  │
│   └──────────┬────────────────────┬──────────────────────────┘  │
│              │                    │                             │
│              ▼                    ▼                             │
│   ┌──────────────────┐  ┌──────────────────────────────────┐    │
│   │  LANGCHAIN       │  │         STORAGE LAYER            │    │
│   │  PIPELINE        │  │                                  │    │
│   │                  │  │  ┌─────────────┐ ┌────────────┐  │    │
│   │  PromptTemplate  │  │  │   SQLite    │ │  ChromaDB  │  │    │
│   │  Memory Retrieval│  │  │             │ │            │  │    │
│   │  Doc Retrieval   │  │  │ Sessions    │ │ Memory     │  │    │
│   │  Context Build   │  │  │ Messages    │ │ Vectors    │  │    │
│   │  Response Stream │  │  │ Memories    │ │            │  │    │
│   └────────┬─────────┘  │  │ Documents   │ │ Doc Chunks │  │    │
│            │            │  └─────────────┘ └────────────┘  │    │
│            ▼            └──────────────────────────────────┘    │
│   ┌──────────────────┐                                          │
│   │  OLLAMA (Local)  │                                          │
│   │                  │                                          │
│   │  llama3          │                                          │
│   │  nomic-embed-text│                                          │
│   │  mistral / phi3  │                                          │
│   └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Chat Request Flow

```text
User Types Message
       │
       ▼
useChat Hook (React)
  └── fetch POST /chat  ─────────────────────────────────────────┐
                                                                 │
                                                         FastAPI /chat
                                                                 │
                              ┌──────────────────────────────────┤
                              │                                  │
                              ▼                                  │
                   Retrieve Memories                             │
                   (ChromaDB semantic search)                    │
                   filter by session_id                          │
                   threshold > 0.3 similarity                    │
                              │                                  │
                              ▼                                  │
                   Retrieve Document Chunks                      │
                   (ChromaDB MMR search)                         │
                   across all session documents                  │
                              │                                  │
                              ▼                                  │
                   Build LangChain Prompt                        │
                   ┌─────────────────────────────┐               │
                   │ SYSTEM: memories + doc ctx  │               │
                   │ HISTORY: last 6 messages    │               │
                   │ HUMAN: user message         │               │
                   └─────────────────────────────┘               │
                              │                                  │
                              ▼                                  │
                   OllamaLLM.astream()                           │
                   yields tokens ──► SSE Stream ──► Browser      │
                              │                                  │
                              ▼                                  │
                   Store Assistant Message (SQLite)              │
                              │                                  │
                              ▼                                  │
                   Extract Memories (LLM pipeline)               │
                   Store Facts (SQLite + ChromaDB)               │
                              │                                  │
                              ▼                                  │
                   Browser renders tokens in real-time           │
                   Shows 🧠 memory badge + 📄 docs badge        
```

### RAG Document Pipeline

```text
User Uploads PDF/TXT/MD
         │
         ▼
  ┌─────────────────┐
  │   File Saved    │
  │  to uploads/    │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Text Extraction │
  │  PyPDFLoader    │
  │  TextLoader     │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │         Intelligent Chunking            │
  │   RecursiveCharacterTextSplitter        │
  │   chunk_size=1000, overlap=200          │
  │   separators: ["\n\n","\n",". "," ",""] │
  └────────┬────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │         Vector Embeddings               │
  │   nomic-embed-text via Ollama           │
  │   768-dimensional vectors               │
  └────────┬────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │         ChromaDB Storage                │
  │   Unique collection per document        │
  │   Persistent on disk                    │
  │   Metadata: source, page, chunk_index   │
  └────────┬────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │      Query Time (MMR Retrieval)         │
  │   fetch_k = 12 candidates               │
  │   return k = 4 diverse results          │
  │   lambda_mult = 0.7 (relevance bias)    │
  └────────┬────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │      LLM Context Injection              │
  │   Formatted with source citations       │
  │   Injected into system prompt           │
  └─────────────────────────────────────────┘
```

### Memory System Pipeline

```text
Conversation Happens
        │
        ▼
LLM Extracts Facts
┌──────────────────────────────────────────┐
│  Prompt: "Extract important personal     │
│  facts from this conversation..."        │
│  Returns: JSON array of facts            │
└──────────────────┬───────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
  SQLite Storage        ChromaDB Storage
  ┌──────────────┐      ┌──────────────────┐
  │ memory_id    │      │ Vector embedding │
  │ session_id   │      │ of fact text     │
  │ fact (text)  │      │                  │
  │ category     │      │ Metadata:        │
  │ confidence   │      │  session_id      │
  │ created_at   │      │  category        │
  └──────────────┘      │  memory_id       │
                        └──────────────────┘
                                │
                                ▼
                   Query Time: Semantic Search
                   ┌──────────────────────────┐
                   │ similarity_search with   │
                   │ session_id filter        │
                   │ relevance threshold 0.3  │
                   └──────────────────────────┘
                                │
                                ▼
                   Inject into System Prompt
                   "Relevant memories about user:
                    - User prefers Python
                    - User works at a startup
                    - User loves FastAPI"
```

---

## Tech Stack

| Layer              | Technology                     | Purpose                      |
| ------------------ | ------------------------------ | ---------------------------- |
| **Frontend**       | React 18 + Vite                | UI framework + build tool    |
| **Styling**        | TailwindCSS v3                 | Utility-first dark theme     |
| **Animations**     | Framer Motion                  | Smooth transitions           |
| **Icons**          | Lucide React                   | Consistent icon set          |
| **Markdown**       | React Markdown + remark-gfm    | AI response rendering        |
| **HTTP Client**    | Axios + Fetch                  | API calls + SSE streaming    |
| **Backend**        | FastAPI                        | High-performance async API   |
| **LLM Runtime**    | Ollama                         | Local model inference        |
| **AI Framework**   | LangChain                      | Prompt chains + retrieval    |
| **LLM**            | llama3 / mistral               | Language generation          |
| **Embeddings**     | nomic-embed-text               | Semantic vector creation     |
| **Vector DB**      | ChromaDB                       | Semantic similarity search   |
| **Relational DB**  | SQLite                         | Session + memory persistence |
| **PDF Parsing**    | PyPDF                          | Document text extraction     |
| **Text Splitting** | RecursiveCharacterTextSplitter | Intelligent chunking         |

---

## Requirements

### System Requirements

| Requirement | Minimum                | Recommended |
| ----------- | ---------------------- | ----------- |
| OS          | macOS 12+ / Ubuntu 20+ | macOS 14+   |
| RAM         | 8 GB                   | 16 GB       |
| Storage     | 10 GB free             | 20 GB free  |
| Python      | 3.11+                  | 3.11.8      |
| Node.js     | 18+                    | 20+         |

### Software Prerequisites

```bash
# 1. Python 3.11+
python3 --version   # must be 3.11.x or higher

# 2. Node.js 18+
node --version      # must be v18.x or higher
npm --version       # must be 9.x or higher

# 3. Ollama
# Download from https://ollama.com
ollama --version    # must be installed
```

### Python Dependencies

```text
fastapi==0.111.0
uvicorn[standard]==0.30.1
python-multipart==0.0.9
langchain==0.2.16
langchain-community==0.2.16
langchain-chroma==0.1.4
langchain-ollama==0.1.3
chromadb==0.5.3
sentence-transformers==3.0.1
pypdf==4.2.0
sqlalchemy==2.0.31
pydantic==2.8.2
pydantic-settings==2.3.4
python-dotenv==1.0.1
aiofiles==23.2.1
httpx==0.27.0
```

### Frontend Dependencies

```text
react: ^18.3.1
react-dom: ^18.3.1
axios: ^1.7.2
react-markdown: ^9.0.1
framer-motion: ^11.2.12
react-dropzone: ^14.2.3
lucide-react: ^0.395.0
date-fns: ^3.6.0
remark-gfm: ^4.0.0
uuid: ^10.0.0
```

---

# Setup

## Step 1 — Clone the Repository

```bash
git clone https://github.com/yourusername/nexus-memory.git
cd nexus-memory
```

---

## Step 2 — Install and Start Ollama

```bash
# Download Ollama from https://ollama.com
# After installation, pull required models:

ollama pull llama3
ollama pull nomic-embed-text

# Verify models are available
ollama list
```

Expected output:

```bash
NAME                       ID              SIZE    MODIFIED
llama3:latest              365c0bd3c000    4.7 GB  X days ago
nomic-embed-text:latest    0a109f422b47    274 MB  X days ago
```

---

## Step 3 — Backend Setup

```bash
# Navigate to project root
cd nexus-memory

# Create virtual environment at ROOT level (important!)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate          # macOS / Linux
# venv\Scripts\activate           # Windows

# Install all dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Pre-compile packages to prevent watchfiles issues
python -m compileall venv/lib/python3.11/site-packages/ -q

# Start the backend
cd backend
python run.py
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

---

## Step 4 — Frontend Setup

```bash
# Open a NEW terminal tab
cd nexus-memory/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Step 5 — Verify Everything is Running

```bash
# Check system health
curl -s http://localhost:8000/health | python -m json.tool
```

Expected response:

```json
{
  "api": "healthy",
  "ollama": {
    "status": "healthy",
    "models": ["nomic-embed-text:latest", "llama3:latest"],
    "current_model": "llama3"
  },
  "model": "llama3"
}
```

Open `http://localhost:5173` — you should see the dark Nexus Memory interface.

---

# Project Structure

```text
nexus-memory/
│
├── venv/                          # Python virtual environment (root level)
│
├── backend/
│   ├── main.py                    # FastAPI app + lifespan + CORS
│   ├── config.py                  # Settings + environment config
│   ├── database.py                # SQLAlchemy models + session
│   ├── run.py                     # Uvicorn server with watch config
│   │
│   ├── routes/
│   │   ├── chat.py                # POST /chat (streaming SSE)
│   │   ├── upload.py              # POST /upload (document processing)
│   │   └── memory.py              # GET/POST/DELETE /memory
│   │
│   ├── rag/
│   │   ├── loader.py              # PDF + TXT document loading
│   │   ├── chunker.py             # RecursiveCharacterTextSplitter
│   │   ├── embeddings.py          # ChromaDB store + load + delete
│   │   └── retriever.py           # MMR semantic retrieval
│   │
│   ├── memory/
│   │   ├── store.py               # SQLite + ChromaDB memory storage
│   │   └── extractor.py           # LLM-based fact extraction
│   │
│   ├── services/
│   │   └── llm.py                 # Ollama LLM + embeddings factory
│   │
│   ├── uploads/                   # Uploaded document storage
│   ├── chroma_db/                 # ChromaDB vector persistence
│   └── nexus_memory.db            # SQLite database
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   │
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Root layout + session state
│       ├── index.css              # Tailwind + custom styles
│       │
│       ├── components/
│       │   ├── ChatWindow.jsx     # Main chat interface
│       │   ├── MessageBubble.jsx  # User + AI message rendering
│       │   ├── Sidebar.jsx        # Sessions + Memory tabs
│       │   ├── UploadSection.jsx  # Drag-drop document upload
│       │   ├── MemoryPanel.jsx    # Memory viewer + editor
│       │   ├── TypingIndicator.jsx # Animated typing dots
│       │   └── ModelSelector.jsx  # Ollama model picker (portal)
│       │
│       ├── hooks/
│       │   └── useChat.js         # SSE streaming hook
│       │
│       └── services/
│           └── api.js             # All API call functions
│
├── screenshots/                   # App screenshots
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

---

# Usage Guide

## Basic Chat

Open `http://localhost:5173`

Click New Chat or type directly in the input box

Press Enter to send (`Shift+Enter` for new line)

Watch the AI stream its response in real-time

---

## Persistent Memory

The system automatically extracts and stores facts from your conversations:

```text
You: "My name is Alex and I prefer Python over JavaScript"

→ Memory extracted: "User's name is Alex"
→ Memory extracted: "User prefers Python over JavaScript"
→ Stored in: SQLite + ChromaDB

Later...

You: "What language should I use for my next project?"

→ AI retrieves memories → recommends Python with context
→ Shows: 🧠 2 memories badge
```

### Manually Add Memories

Click the 🧠 Brain icon in the top bar

Click Add Memory Manually

Enter fact + select category → Save

---

## PDF / Document Chat

Click the 📎 Paperclip icon in the input bar

Drag & drop or click to select PDF, TXT, or MD file

Wait for `"X chunks ready"` confirmation

Ask questions about your document:

```text
You: "What is the quarterly revenue?"

→ AI retrieves relevant chunks → answers from document
→ Shows: 📄 3 chunks badge
```

---

## Combined Memory + Documents

```text
You: "Given my Python expertise, what do you think
      about the tech stack in the uploaded document?"

→ AI uses: memories (your Python background)
         + documents (the uploaded file context)

→ Shows BOTH: 🧠 memories badge + 📄 chunks badge
```

---

## Model Switching

Click the model selector (top right, shows current model)

Dropdown shows all installed Ollama models

Click any model to switch for the next message

---

# API Reference

## Chat

| Method | Endpoint                       | Description                      |
| ------ | ------------------------------ | -------------------------------- |
| POST   | `/chat`                        | Send message, returns SSE stream |
| GET    | `/chat/sessions`               | List all chat sessions           |
| GET    | `/chat/sessions/{id}/messages` | Get session message history      |
| DELETE | `/chat/sessions/{id}`          | Delete session + messages        |

### POST `/chat` Request Body

```json
{
  "message": "What is my favorite language?",
  "session_id": "uuid-here",
  "model": "llama3",
  "stream": true
}
```

### SSE Stream Events

```text
data: {"type": "metadata", "session_id": "...", "memories_used": 2, "docs_retrieved": 3}
data: {"type": "token", "content": "Based"}
data: {"type": "token", "content": " on"}
data: {"type": "done"}
```

## Documents

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |
| POST   | `/upload`                 | Upload + process document |
| GET    | `/documents/{session_id}` | List session documents    |
| DELETE | `/documents/{id}`         | Delete document + vectors |

### POST `/upload` (multipart form)

```text
file: <PDF/TXT/MD file>
session_id: "uuid-here"
```

---

## Memory

| Method | Endpoint               | Description               |
| ------ | ---------------------- | ------------------------- |
| GET    | `/memory/{session_id}` | Get all session memories  |
| GET    | `/memory`              | Get all memories (global) |
| POST   | `/memory`              | Add memory manually       |
| DELETE | `/memory/{id}`         | Delete specific memory    |

### POST `/memory` Request Body

```json
{
  "session_id": "uuid-here",
  "fact": "User prefers dark mode editors",
  "category": "preference"
}
```

---

## System

| Method | Endpoint  | Description                   |
| ------ | --------- | ----------------------------- |
| GET    | `/health` | System health + Ollama status |
| GET    | `/docs`   | Interactive Swagger UI        |

---

#  Quick Commands

```bash
# ── Start All Services ──────────────────────────────────────────

# Terminal 1: Ollama (if not running as background service)
ollama serve

# Terminal 2: Backend
cd nexus-memory/backend
source ../venv/bin/activate
python run.py

# Terminal 3: Frontend
cd nexus-memory/frontend
npm run dev


# ── Useful Debug Commands ────────────────────────────────────────

# Check health
curl -s http://localhost:8000/health | python -m json.tool

# Test chat (non-streaming)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "session_id": "test", "stream": false}'

# Add a memory manually
curl -X POST http://localhost:8000/memory \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test", "fact": "I love Python", "category": "technical"}'

# View memories
curl http://localhost:8000/memory/test | python -m json.tool

# Check SQLite database
cd nexus-memory/backend
sqlite3 nexus_memory.db ".tables"
sqlite3 nexus_memory.db "SELECT fact, category FROM memory_entries;"

# Check ChromaDB collections
cd nexus-memory
source venv/bin/activate
python3 -c "
import chromadb
client = chromadb.PersistentClient(path='backend/chroma_db')
for col in client.list_collections():
    print(f'{col.name}: {col.count()} vectors')
"


# ── Reset / Clean Data ───────────────────────────────────────────

# Delete all chat data (keeps code)
rm backend/nexus_memory.db
rm -rf backend/chroma_db/
rm -rf backend/uploads/*

# Full dependency reinstall
cd nexus-memory
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### Key Learnings:

- RAG quality depends heavily on chunk size and overlap tuning
- Local LLM latency requires careful UX design (streaming is essential)
- Memory retrieval needs relevance thresholds to avoid noise
- Pydantic v1/v2 compatibility requires careful version pinning
- ChromaDB stacking contexts cause subtle UI z-index bugs

---

# License

```text
MIT License

Copyright (c) 2026 Nexus Memory

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

Built with ❤️ using local AI — no cloud required

⬆ Back to Top

</div>
