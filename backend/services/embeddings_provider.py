"""Embedding providers.

Embeddings sit in the request path — every chat turn embeds the query to recall
memories, and every upload embeds its chunks. The model itself, though, does not
have to live in this process. Running MiniLM in-process pulls in torch (~1 GB),
which will not fit in a serverless function, so the model is resolved through a
provider chain instead:

    supabase  a gte-small Edge Function on the project's own Supabase
    openai    any OpenAI-compatible /v1/embeddings endpoint
    local     sentence-transformers in-process (Docker and local dev)

All three are 384-dimensional by default, so one pgvector schema serves every
provider and switching hosts does not require a re-embed.
"""
import logging
import httpx

from langchain_core.embeddings import Embeddings
from config import settings

logger = logging.getLogger(__name__)

# Edge functions and inference APIs both rate-limit on payload size, so long
# document uploads are embedded in batches rather than one request per chunk.
BATCH_SIZE = 24
TIMEOUT = 60.0
RETRIES = 3


class _HTTPEmbeddings(Embeddings):
    """Shared batching, retry and validation for the HTTP-backed providers."""

    name = "http"

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    def _embed_all(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for i in range(0, len(texts), BATCH_SIZE):
            batch = [t if t and t.strip() else " " for t in texts[i : i + BATCH_SIZE]]
            vectors.extend(self._with_retries(batch))
        return vectors

    def _with_retries(self, batch: list[str]) -> list[list[float]]:
        last: Exception | None = None
        for attempt in range(RETRIES):
            try:
                out = self._embed_batch(batch)
                if len(out) != len(batch):
                    raise ValueError(
                        f"{self.name} returned {len(out)} vectors for {len(batch)} inputs"
                    )
                return out
            except Exception as e:  # noqa: BLE001 — retried, then re-raised
                last = e
                # A cold edge function can take a few seconds to boot; back off
                # rather than failing the whole chat turn on the first miss.
                if attempt < RETRIES - 1:
                    import time

                    time.sleep(0.6 * (attempt + 1))
        logger.error(f"{self.name} embeddings failed after {RETRIES} attempts: {last}")
        raise last

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed_all(list(texts))

    def embed_query(self, text: str) -> list[float]:
        return self._embed_all([text])[0]


class SupabaseEdgeEmbeddings(_HTTPEmbeddings):
    """gte-small running on a Supabase Edge Function (384-dim, free, always on)."""

    name = "supabase"

    def __init__(self, url: str, key: str, function: str):
        self.endpoint = f"{url.rstrip('/')}/functions/v1/{function}"
        self.headers = {
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json",
        }

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        r = httpx.post(
            self.endpoint,
            headers=self.headers,
            json={"input": texts},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        return r.json()["embeddings"]


class OpenAICompatibleEmbeddings(_HTTPEmbeddings):
    """Any endpoint that speaks the OpenAI /v1/embeddings shape."""

    name = "openai"

    def __init__(self, base_url: str, key: str, model: str):
        self.endpoint = f"{base_url.rstrip('/')}/embeddings"
        self.model = model
        self.headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        r = httpx.post(
            self.endpoint,
            headers=self.headers,
            json={"model": self.model, "input": texts},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        data = sorted(r.json()["data"], key=lambda d: d["index"])
        return [d["embedding"] for d in data]


def resolve_provider() -> str:
    """Which provider this deployment will use, without constructing it."""
    choice = (settings.EMBEDDING_PROVIDER or "auto").lower()
    if choice != "auto":
        return choice
    if settings.SUPABASE_URL and (
        settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_KEY
    ):
        return "supabase"
    if settings.EMBEDDINGS_BASE_URL and settings.EMBEDDINGS_API_KEY:
        return "openai"
    return "local"


_cached: Embeddings | None = None


def get_embeddings() -> Embeddings:
    """Build (once) the embedding model for the configured provider."""
    global _cached
    if _cached is not None:
        return _cached

    provider = resolve_provider()

    if provider == "supabase":
        _cached = SupabaseEdgeEmbeddings(
            url=settings.SUPABASE_URL,
            key=settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_KEY,
            function=settings.SUPABASE_EMBED_FUNCTION,
        )
    elif provider == "openai":
        _cached = OpenAICompatibleEmbeddings(
            base_url=settings.EMBEDDINGS_BASE_URL,
            key=settings.EMBEDDINGS_API_KEY,
            model=settings.EMBEDDINGS_MODEL,
        )
    else:
        # Imported lazily: torch is absent from the serverless build.
        from langchain_community.embeddings import SentenceTransformerEmbeddings

        _cached = SentenceTransformerEmbeddings(
            model_name=settings.LOCAL_EMBEDDING_MODEL
        )

    logger.info(f"Embeddings provider: {provider}")
    return _cached


def embeddings_health() -> dict:
    """Round-trip one short string so /health reports a real answer."""
    provider = resolve_provider()
    try:
        vector = get_embeddings().embed_query("health check")
        return {
            "status": "healthy",
            "provider": provider,
            "dimensions": len(vector),
        }
    except Exception as e:  # noqa: BLE001 — health must never raise
        return {"status": "unhealthy", "provider": provider, "error": str(e)[:200]}
