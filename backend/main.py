import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from database import init_db
from routes import chat, upload, memory
from services.llm import (
    check_llm_health,
    default_model,
    list_available_models,
    resolve_provider,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

# A serverless instance runs lifespan on every cold start, so schema creation
# is done once per process and never blocks the first request from serving.
_schema_ready = False


def ensure_schema():
    global _schema_ready
    if _schema_ready:
        return
    try:
        init_db()
        _schema_ready = True
        logger.info("Database ready")
    except Exception as e:
        logger.error(f"Database init failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Kept deliberately cheap: this runs on every cold start, ahead of the
    # request that triggered it. Probing the chat provider here cost a network
    # round trip for a log line, and /health answers the same question on
    # demand, so it is not done.
    logger.info(f"Starting {settings.APP_NAME} {settings.APP_VERSION}")
    provider, model = resolve_provider(None)
    logger.info(f"Chat will route to {provider} ({model})")

    ensure_schema()

    yield

    logger.info("Shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI assistant with persistent memory and document chat",
    lifespan=lifespan,
)

# Set CORS_ORIGINS to a comma-separated list to restrict origins. Defaults to
# "*" so the deployed API stays reachable from any frontend deployment.
_cors_env = os.environ.get("CORS_ORIGINS", "*")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # Browsers reject credentials alongside a wildcard origin.
    allow_credentials="*" not in _cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, tags=["Chat"])
app.include_router(upload.router, tags=["Documents"])
app.include_router(memory.router, tags=["Memory"])


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/models")
async def models():
    """Models the client may pick, each tagged with the provider serving it."""
    return {
        "models": list_available_models(),
        "default": default_model(),
    }


@app.get("/health")
async def health_check():
    from services.cache import cache_status
    from services.embeddings_provider import resolve_provider

    llm_status = await check_llm_health()
    return {
        "api": "healthy",
        "llm": llm_status,
        # Key kept for older frontend builds that read `ollama`.
        "ollama": llm_status,
        "model": llm_status.get("current_model"),
        "embeddings": {"provider": resolve_provider()},
        "cache": cache_status(),
    }


@app.get("/health/deep")
async def health_deep():
    """Health that actually exercises the DB and the embedding provider."""
    from services.embeddings_provider import embeddings_health
    from database import engine
    from sqlalchemy import text

    db = {"status": "healthy"}
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db = {"status": "unhealthy", "error": str(e)[:200]}

    return {
        "api": "healthy",
        "database": db,
        "embeddings": embeddings_health(),
        "llm": await check_llm_health(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
