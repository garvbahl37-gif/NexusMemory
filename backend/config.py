import os

from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):

    APP_NAME:    str = "Nexus Memory"
    APP_VERSION: str = "2.0.0"
    DEBUG:       bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Chat providers ────────────────────────────────────────────────
    # Requests are routed by model id, so Groq and Ollama Cloud can be
    # configured at the same time and switched from the model picker.

    # Groq (LPU inference). https://console.groq.com
    GROQ_API_KEY: str = ""
    GROQ_MODEL:   str = "llama-3.3-70b-versatile"

    # Ollama Cloud — hosted, OpenAI-compatible. https://ollama.com/settings/keys
    OLLAMA_API_KEY:      str = ""
    OLLAMA_CLOUD_URL:    str = "https://ollama.com"
    OLLAMA_CLOUD_MODEL:  str = "gemma4:31b"

    # A local `ollama serve`, used only when neither hosted key is present.
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL:    str = "llama3"

    # ── Embeddings ────────────────────────────────────────────────────
    # "auto" resolves to the first provider that is configured:
    #   supabase -> gte-small Edge Function (384-dim, free, always on)
    #   openai   -> any OpenAI-compatible /v1/embeddings endpoint
    #   local    -> sentence-transformers in-process (needs torch)
    EMBEDDING_PROVIDER:   str = "auto"
    EMBEDDING_DIMENSIONS: int = 384

    # Supabase Edge Function provider. The embed function computes vectors
    # and reads no data, so it is called with the anon key; the service key
    # is only used where Storage needs it.
    SUPABASE_EMBED_FUNCTION: str = "embed"
    SUPABASE_ANON_KEY:       str = ""

    # OpenAI-compatible provider
    EMBEDDINGS_BASE_URL: str = ""
    EMBEDDINGS_API_KEY:  str = ""
    EMBEDDINGS_MODEL:    str = "text-embedding-3-small"

    # In-process provider (Docker / local dev only)
    LOCAL_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # ── Supabase (Postgres + Storage + Edge Functions) ────────────────
    SUPABASE_URL:         str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_BUCKET:      str = "nexus-uploads"

    # ── Cache ─────────────────────────────────────────────────────────
    # Optional. Unset (the default on serverless) means no caching, and
    # every read falls through to Postgres.
    REDIS_URL: str = ""
    CACHE_TTL: int = 120

    BASE_DIR:     Path = Path(__file__).parent
    UPLOAD_DIR:   Path = Path("/tmp/nexus-uploads")
    DATABASE_URL: str  = f"sqlite:///{Path(__file__).parent}/nexus_memory.db"

    CHUNK_SIZE:    int = 1000
    CHUNK_OVERLAP: int = 200
    RETRIEVAL_K:   int = 4

    MEMORY_RETRIEVAL_K: int = 5
    MAX_MEMORY_CONTEXT: int = 3

    model_config = {
        "env_file":          ".env",
        "env_file_encoding": "utf-8",
        "extra":             "ignore",
        "case_sensitive":    False,
    }


settings = Settings()

# Serverless filesystems are read-only apart from /tmp, so directory creation
# is best-effort — nothing here is required for the app to serve requests.
try:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass
