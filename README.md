# Nexus Memory

> A premium AI assistant that **remembers you across sessions**, answers questions from **your documents**, and replies in an instant — running end to end on **Vercel**, with durable **Supabase** storage.

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Ollama Cloud](https://img.shields.io/badge/Ollama_Cloud-hosted_models-000000?style=flat-square&logo=ollama&logoColor=white)](https://ollama.com)
[![Vercel](https://img.shields.io/badge/Vercel-frontend_%2B_API-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_pgvector-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## Screenshots

| | |
| --- | --- |
| ![Welcome](screenshots/01-welcome.png) | ![Chat with citations](screenshots/02-chat.png) |
| **Welcome** — suggestion cards and ambient backdrop | **Chat** — streaming replies, tables, highlighted code, memory/source chips |
| ![Memory Store](screenshots/03-memory-store.png) | ![Boot sequence](screenshots/04-boot-sequence.png) |
| **Memory Store** — searchable, editable, category-filtered | **Boot sequence** — cinematic startup |

---

## What is Nexus Memory?

Nexus Memory is a full-stack AI assistant focused on **long-term memory**. Unlike a generic chatbot it:

- **Remembers facts about you** across every conversation (semantic memory, scoped per user)
- **Reads your documents** (PDF, DOCX, CSV, TXT, MD) and answers with **inline citations** (RAG)
- **Streams replies** from six hosted models on **Ollama Cloud** — GPT-OSS, Gemma 4 and Nemotron 3 — switchable mid-conversation from the model picker
- **Persists everything** in Supabase (Postgres + pgvector) — survives restarts & works across devices
- **Never sleeps** — the API is a Vercel function beside the frontend, not a container that idles out
- Ships with a **premium, cinematic UI** — voice I/O, code highlighting, personas, and more

---

## Features

### Persistent memory (the core)
- **Cross-session recall** — memories are scoped per user (`client_id`) and recalled in every chat
- **LLM extraction** — facts are extracted with category + confidence, then **de-duplicated** on write
- **Provenance** — each memory shows the message it came from
- **Editable memory panel** — inline edit, search, and category filters
- Backed by **Postgres** (facts) + **pgvector** (semantic search)

### Document chat (RAG)
- Upload **PDF, DOCX, CSV, TXT, MD**
- Chunking → embeddings (`gte-small`, 384-dim) → pgvector
- **Inline citations** — see exactly which source/page answered
- MMR retrieval (with similarity fallback)

### Premium chat UX
- **Streaming** replies with a natural **typewriter** reveal
- **Stop / Regenerate / Edit-and-resend**
- **Syntax-highlighted code blocks** with copy buttons
- **Slash commands** — `/summarize`, `/translate`, `/clear`, `/help`
- **Search conversations**, **export to Markdown**
- **Conversation summarization** keeps long chats coherent

### Voice & settings
- **Voice input** (speech-to-text) and **read-aloud** replies (TTS) + auto-speak
- **Settings**: temperature, **persona presets** (Concise / Mentor / Creative) + custom system prompt

### Design — "Graphite & Champagne"
- A neutral graphite base (`#0B0B0C` → `#212125`) with a single champagne-gold accent (`#C9A227`)
- Gold is treated as **jewelry, not fabric** — it is reserved for the primary action, focus rings and active states, so the interface separates by tone rather than hue
- Surfaces are raised by an **inset top hairline** (light-on-edge) rather than drop shadows, on a three-step elevation ladder
- **WCAG AA** across the board: body text is checked against every surface it sits on, and near-black ink (never white) is used on gold fills
- Cinematic boot sequence, floating rounded panels, ambient backdrops — tuned to stay **smooth** (GPU-composited, no scroll jank)

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│  ONE VERCEL DEPLOYMENT                                        │
│                                                               │
│  /            static build  (React + Vite + Tailwind)         │
│  /api/*       Python function (FastAPI, SSE streaming)        │
│               ChatWindow · MemoryPanel · Sidebar · Settings    │
└───────────────────────────┬──────────────────────────────────┘
                            │  same origin, no CORS hop
                            ▼
     ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐
     │ Ollama Cloud │  │ Supabase Edge Fn │  │  Supabase      │
     │ or Groq      │  │ gte-small        │  │  Postgres +    │
     │ (chat, SSE)  │  │ (embeddings)     │  │  pgvector      │
     └──────────────┘  └──────────────────┘  └────────────────┘
```

The API runs where the frontend does, so there is no separate backend host to
wake up. Embeddings are an HTTP call rather than an in-process model: torch and
sentence-transformers are ~1 GB against Vercel's 250 MB function limit, so the
model lives in a Supabase Edge Function instead. Both it and the old in-process
MiniLM emit 384-dimensional vectors, so the pgvector schema is the same either
way.

When `DATABASE_URL` is **not** set, the backend falls back to local **SQLite**, scoring vectors in Python — zero-config local dev with no vector engine to install.

---

## Tech Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| Frontend           | React 18 + Vite + TailwindCSS       |
| Animation          | Framer Motion                       |
| Markdown / code    | react-markdown + rehype-highlight   |
| Backend            | FastAPI (async, SSE streaming)      |
| Chat               | Ollama Cloud (`gpt-oss:120b` default) or Groq |
| AI framework       | langchain-core (+ provider adapters) |
| Embeddings         | Supabase Edge Function — `gte-small` (384-dim) |
| Database           | Supabase **Postgres** (SQLite fallback) |
| Vector store       | **pgvector**, queried directly       |
| Hosting            | Vercel — static frontend + Python function |
| Docs               | pypdf · python-docx · CSV           |

---

## Models

Chat runs on **Ollama Cloud**. Requests are routed by model id, so switching in
the picker switches provider too — Groq models appear in the same list when
`GROQ_API_KEY` is set.

These six are reachable on a **free** Ollama key, and all six return
OpenAI-style `tool_calls`:

| Model | id | Notes |
| --- | --- | --- |
| **GPT-OSS 120B** | `gpt-oss:120b` | **Default.** Strongest of the free set; streams a short reasoning preamble before the answer |
| GPT-OSS 20B | `gpt-oss:20b` | Same family, smaller and cheaper to run |
| Gemma 4 31B | `gemma4:31b` | No reasoning preamble — the most direct replies |
| Nemotron 3 Nano | `nemotron-3-nano:30b` | Smallest; useful when you want terse output |
| Nemotron 3 Super | `nemotron-3-super` | Longer reasoning, noticeably slower to first visible token |
| Nemotron 3 Ultra | `nemotron-3-ultra` | Largest Nemotron |

Measured against production (Singapore region, warm function, "what is a vector
database?"):

| Model | First visible token | Full reply |
| --- | --- | --- |
| `gemma4:31b` | 1.01 s | 1.89 s |
| `gpt-oss:120b` | 1.12 s | 2.02 s |
| `nemotron-3-super` | 4.32 s | 6.06 s |

The rest of Ollama's catalogue — GLM, Kimi, MiniMax, DeepSeek, Qwen, Mistral
Large — is still listed in the picker but greyed out, because a free key gets
a subscription error from them. `GET /models` reports the whole catalogue with
an `available` flag per model, so the UI never offers a model the request would
fail on.

Change the default with `OLLAMA_CLOUD_MODEL`. A per-browser choice is kept in
`localStorage` and wins over the default; the reply's own metadata reports which
model actually answered.

---

## Configuration (environment variables)

| Variable | Required | Description |
| --- | --- | --- |
| `OLLAMA_API_KEY` | one of these | Key from [ollama.com/settings/keys](https://ollama.com/settings/keys) |
| `GROQ_API_KEY` | one of these | Free key from [console.groq.com](https://console.groq.com) |
| `DATABASE_URL` | Recommended | Supabase **transaction-pooler** URI. Unset → local SQLite. |
| `SUPABASE_URL` | for embeddings | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | for embeddings | Used only to call the `embed` function, which reads no data |
| `EMBEDDING_PROVIDER` | optional | `auto` (default), `supabase`, `openai`, or `local` |
| `SUPABASE_SERVICE_KEY` | optional | Enables Supabase Storage for raw uploads |
| `OLLAMA_CLOUD_MODEL` | optional | Default model. Currently `gpt-oss:120b` |
| `CORS_ORIGINS` | optional | Comma-separated allowed origins (defaults to `*`) |
| `REDIS_URL` | optional | Response caching. Unset → every read hits Postgres. |

Both chat providers can be set at once — requests are routed by the model id
the client asks for, so the model picker switches provider as a side effect.

Set `EMBEDDING_PROVIDER=openai` with `EMBEDDINGS_BASE_URL`, `EMBEDDINGS_API_KEY`
and `EMBEDDINGS_MODEL` to use any OpenAI-compatible `/v1/embeddings` endpoint
instead; `local` runs sentence-transformers in-process (container only — see
`requirements-local.txt`).

> For Supabase: use the **transaction pooler** (port 6543, IPv4) and enable the
> `vector` extension. The app creates its own `nexus_vectors` table on first run.

---

## Run locally

### Backend
```bash
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements-local.txt
export OLLAMA_API_KEY=your_key      # Windows: $env:OLLAMA_API_KEY="your_key"
cd backend && uvicorn main:app --reload --port 8000
```
No `DATABASE_URL` → local SQLite, with vectors scored in Python. Add
`SUPABASE_URL` + `SUPABASE_ANON_KEY` to use the hosted embedder, or leave them
unset and `requirements-local.txt` will run MiniLM on the CPU.

`requirements.txt` is the slim, serverless-safe set; `requirements-local.txt`
adds the in-process extras.

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```
Set `VITE_API_URL` in `frontend/.env` to point at a deployed backend (defaults to `http://localhost:8000`).

---

## Deploy (Vercel + Supabase)

Frontend and API ship as **one Vercel project** — `vercel.json` builds the Vite
app to `frontend/dist` and mounts FastAPI at `/api` via `api/index.py`.

1. **Embeddings.** Deploy an Edge Function named `embed` to your Supabase
   project that returns `{ "embeddings": number[][] }` for a `{ "input": string[] }`
   body, using `new Supabase.ai.Session("gte-small")`.
2. **Database.** Enable the `vector` extension. The app creates its own tables.
3. **Environment.** Set `OLLAMA_API_KEY`, `DATABASE_URL`, `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` on the Vercel project (all three environments).
4. **Ship.** `vercel deploy --prod`.

`VITE_API_URL` is `/api` in production — same origin, so there is no CORS hop
and no second host to keep awake.

> Vercel pins Python 3.14 for functions and ignores `.python-version` and
> `Pipfile`, so every pin in `requirements.txt` must have a cp314 wheel.

A `Dockerfile` and `start.sh` are still included for running the whole thing as
one container (Fly.io, Railway, a Docker Space) with embeddings in-process.

---

## API Reference (selected)

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/chat` | Send a message, returns an SSE stream (tokens + citations) |
| GET | `/chat/sessions` | List this client's sessions |
| POST | `/upload` | Upload + index a document |
| GET/POST/PUT/DELETE | `/memory…` | Manage memories (client-scoped) |
| GET | `/models` | Model catalogue, tagged by provider and reachability |
| GET | `/health` | API, chat provider, embeddings and cache status |
| GET | `/health/deep` | The above, but it actually round-trips the DB and embedder |

All requests carry an `X-Client-Id` header that scopes data per browser/user.

---

## License

MIT — see [LICENSE](LICENSE).

<div align="center">
Memory-driven AI, always awake.
</div>
