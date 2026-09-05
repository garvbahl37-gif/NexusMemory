"""Chat model routing.

Two hosted providers can be configured at once — requests are routed by the
model id the client asks for, so the model picker switches provider as a side
effect of switching model. A local `ollama serve` is the last resort when
neither hosted key is present.
"""
import logging
import httpx

from langchain_core.output_parsers import StrOutputParser
from config import settings

logger = logging.getLogger(__name__)

# Groq's catalog is stable and its /models endpoint needs a key, so it is
# listed here rather than fetched.
GROQ_MODELS = {
    "llama-3.3-70b-versatile": "Llama 3.3 70B",
    "llama-3.1-8b-instant": "Llama 3.1 8B",
    "gemma2-9b-it": "Gemma 2 9B",
}

# Ollama Cloud publishes its catalog, but not which models a given key may
# use — gated models fail at request time with a subscription error. These are
# the ones a free key can reach today; the rest are still listed and still
# selectable, they just surface Ollama's own message if the key lacks access.
OLLAMA_FREE_MODELS = {
    "gemma4:31b",
    "gpt-oss:120b",
    "gpt-oss:20b",
    "nemotron-3-nano:30b",
    "nemotron-3-super",
    "nemotron-3-ultra",
}

OLLAMA_LABELS = {
    "gemma4:31b": "Gemma 4 31B",
    "gpt-oss:120b": "GPT-OSS 120B",
    "gpt-oss:20b": "GPT-OSS 20B",
    "nemotron-3-nano:30b": "Nemotron 3 Nano",
    "nemotron-3-super": "Nemotron 3 Super",
    "nemotron-3-ultra": "Nemotron 3 Ultra",
}

_catalog_cache: list[dict] | None = None


def groq_enabled() -> bool:
    return bool(settings.GROQ_API_KEY)


def ollama_cloud_enabled() -> bool:
    return bool(settings.OLLAMA_API_KEY)


def resolve_provider(model: str | None) -> tuple[str, str]:
    """Map a requested model id onto (provider, model).

    An unknown id goes to whichever hosted provider is configured, so a stale
    model id saved in a browser never hard-fails the request.
    """
    model = (model or "").strip()

    if model in GROQ_MODELS:
        # A Groq id asked for while Groq is unconfigured must not be forwarded
        # to Ollama, which has no such model — fall through to the default.
        if groq_enabled():
            return "groq", model
        model = ""

    if model and ("/" in model or ":" in model or model in OLLAMA_LABELS):
        if ollama_cloud_enabled():
            return "ollama_cloud", model
        return "ollama_local", model

    if ollama_cloud_enabled():
        return "ollama_cloud", model or settings.OLLAMA_CLOUD_MODEL
    if groq_enabled():
        return "groq", model or settings.GROQ_MODEL
    return "ollama_local", model or settings.OLLAMA_MODEL


def default_model() -> str:
    if ollama_cloud_enabled():
        return settings.OLLAMA_CLOUD_MODEL
    if groq_enabled():
        return settings.GROQ_MODEL
    return settings.OLLAMA_MODEL


def get_llm(model: str = None, streaming: bool = False, temperature: float = None):
    """Return a chat model that emits plain string chunks.

    Every provider is wrapped in a StrOutputParser so callers (chat routing,
    memory extraction, summarisation) see one uniform shape.
    """
    temp = 0.7 if temperature is None else max(0.0, min(2.0, float(temperature)))
    provider, model_name = resolve_provider(model)

    if provider == "groq":
        from langchain_groq import ChatGroq

        return (
            ChatGroq(
                model=model_name,
                api_key=settings.GROQ_API_KEY,
                temperature=temp,
            )
            | StrOutputParser()
        )

    if provider == "ollama_cloud":
        # Ollama Cloud speaks the OpenAI wire format, which also gives us
        # streaming and async for free.
        from langchain_openai import ChatOpenAI

        return (
            ChatOpenAI(
                model=model_name,
                api_key=settings.OLLAMA_API_KEY,
                base_url=f"{settings.OLLAMA_CLOUD_URL.rstrip('/')}/v1",
                temperature=temp,
                timeout=120,
                max_retries=1,
            )
            | StrOutputParser()
        )

    try:
        from langchain_ollama import OllamaLLM

        return OllamaLLM(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temp,
        )
    except Exception as e:
        logger.error(f"No chat model available: {e}")
        raise


def list_available_models() -> list[dict]:
    """Every model the client may pick, tagged with its provider."""
    global _catalog_cache

    models: list[dict] = []

    if groq_enabled():
        models += [
            {"id": mid, "label": label, "provider": "groq", "available": True}
            for mid, label in GROQ_MODELS.items()
        ]

    if ollama_cloud_enabled():
        if _catalog_cache is None:
            _catalog_cache = _fetch_ollama_catalog()
        models += _catalog_cache

    if not models:
        models = [
            {
                "id": settings.OLLAMA_MODEL,
                "label": settings.OLLAMA_MODEL,
                "provider": "ollama_local",
                "available": True,
            }
        ]

    return models


def _fetch_ollama_catalog() -> list[dict]:
    """Read Ollama Cloud's catalog, falling back to the known free set."""
    try:
        r = httpx.get(
            f"{settings.OLLAMA_CLOUD_URL.rstrip('/')}/api/tags",
            headers={"Authorization": f"Bearer {settings.OLLAMA_API_KEY}"},
            timeout=10,
        )
        r.raise_for_status()
        names = [m["name"] for m in r.json().get("models", [])]
    except Exception as e:
        logger.warning(f"Could not read the Ollama catalog: {e}")
        names = sorted(OLLAMA_FREE_MODELS)

    return [
        {
            "id": n,
            "label": OLLAMA_LABELS.get(n, n),
            "provider": "ollama",
            "available": n in OLLAMA_FREE_MODELS,
        }
        for n in names
    ]


async def check_llm_health() -> dict:
    """Which provider will serve the next request, and is it reachable."""
    provider, model = resolve_provider(None)

    if provider == "groq":
        return {
            "status": "healthy",
            "provider": "groq",
            "current_model": model,
        }

    if provider == "ollama_cloud":
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(
                    f"{settings.OLLAMA_CLOUD_URL.rstrip('/')}/api/tags",
                    headers={"Authorization": f"Bearer {settings.OLLAMA_API_KEY}"},
                    timeout=10.0,
                )
            if r.status_code == 200:
                return {
                    "status": "healthy",
                    "provider": "ollama-cloud",
                    "current_model": model,
                }
            error = f"Ollama Cloud returned {r.status_code}"
        except Exception as e:
            error = str(e)
        return {"status": "unhealthy", "provider": "ollama-cloud", "error": error}

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        if r.status_code == 200:
            return {
                "status": "healthy",
                "provider": "ollama-local",
                "current_model": model,
            }
    except Exception as e:
        logger.error(f"Local Ollama unreachable: {e}")

    return {
        "status": "unhealthy",
        "provider": "ollama-local",
        "error": f"Cannot reach Ollama at {settings.OLLAMA_BASE_URL}",
    }


def get_embeddings():
    """Kept here so existing imports keep working; see embeddings_provider."""
    from services.embeddings_provider import get_embeddings as _get

    return _get()
