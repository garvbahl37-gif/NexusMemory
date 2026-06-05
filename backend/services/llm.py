import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)


def get_llm(model: str = None, streaming: bool = False):
    """
    Get configured Ollama LLM instance.
    Uses langchain-ollama if available, falls back to langchain-community.
    """
    model_name = model or settings.OLLAMA_MODEL

    # Try langchain-ollama first (newer, preferred)
    try:
        from langchain_ollama import OllamaLLM
        return OllamaLLM(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=0.7,
        )
    except Exception:
        pass

    # Fallback to langchain-community Ollama
    try:
        from langchain_community.llms import Ollama
        return Ollama(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=0.7,
        )
    except Exception as e:
        logger.error(f"Failed to load any LLM: {e}")
        raise


def get_embeddings():
    """
    Get configured embeddings model.
    Tries multiple import paths for compatibility across langchain versions.
    """

    # ── Strategy 1: langchain-ollama (newest) ──────────────────────
    try:
        from langchain_ollama import OllamaEmbeddings
        logger.info("Using langchain_ollama.OllamaEmbeddings")
        return OllamaEmbeddings(
            model=settings.OLLAMA_EMBEDDING_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )
    except (ImportError, Exception) as e:
        logger.warning(f"langchain_ollama OllamaEmbeddings failed: {e}")

    # ── Strategy 2: langchain-community without base_url ───────────
    try:
        from langchain_community.embeddings import OllamaEmbeddings
        logger.info("Using langchain_community.OllamaEmbeddings (no base_url)")
        return OllamaEmbeddings(
            model=settings.OLLAMA_EMBEDDING_MODEL,
        )
    except (ImportError, Exception) as e:
        logger.warning(f"langchain_community OllamaEmbeddings (no base_url) failed: {e}")

    # ── Strategy 3: langchain-community with base_url ──────────────
    try:
        from langchain_community.embeddings import OllamaEmbeddings
        logger.info("Using langchain_community.OllamaEmbeddings (with base_url)")
        return OllamaEmbeddings(
            model=settings.OLLAMA_EMBEDDING_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )
    except (ImportError, Exception) as e:
        logger.warning(f"langchain_community OllamaEmbeddings (with base_url) failed: {e}")

    # ── Strategy 4: sentence-transformers fallback ─────────────────
    try:
        from langchain_community.embeddings import SentenceTransformerEmbeddings
        logger.info("Falling back to SentenceTransformerEmbeddings")
        return SentenceTransformerEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
    except (ImportError, Exception) as e:
        logger.warning(f"SentenceTransformerEmbeddings failed: {e}")

    raise RuntimeError(
        "No embeddings backend available. "
        "Run: pip install langchain-ollama"
    )


async def check_ollama_health() -> dict:
    """Check if Ollama is running and models are available."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.OLLAMA_BASE_URL}/api/tags",
                timeout=5.0,
            )
            if response.status_code == 200:
                data   = response.json()
                models = [m["name"] for m in data.get("models", [])]
                return {
                    "status":        "healthy",
                    "models":        models,
                    "current_model": settings.OLLAMA_MODEL,
                }
    except Exception as e:
        logger.error(f"Ollama health check failed: {e}")

    return {
        "status": "unhealthy",
        "error":  "Cannot reach Ollama at " + settings.OLLAMA_BASE_URL,
        "models": [],
    }


async def list_available_models() -> list:
    """Fetch available models from Ollama."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.OLLAMA_BASE_URL}/api/tags",
                timeout=5.0,
            )
            if response.status_code == 200:
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        logger.error(f"Failed to list models: {e}")

    return [settings.OLLAMA_MODEL]