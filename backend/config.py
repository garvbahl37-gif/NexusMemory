import os
os.environ["ANONYMIZED_TELEMETRY"] = "false"
os.environ["CHROMA_TELEMETRY"]     = "false"
os.environ["POSTHOG_DISABLED"]     = "true"

from pydantic_settings import BaseSettings
from pydantic import field_validator
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    
    APP_NAME:    str = "Nexus Memory"
    APP_VERSION: str = "1.0.0"
    DEBUG:       bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    OLLAMA_BASE_URL:       str = "http://localhost:11434"
    OLLAMA_MODEL:          str = "llama3"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    BASE_DIR:     Path = Path(__file__).parent
    UPLOAD_DIR:   Path = Path(__file__).parent / "uploads"
    CHROMA_DIR:   Path = Path(__file__).parent / "chroma_db"
    DATABASE_URL: str  = (
        f"sqlite:///{Path(__file__).parent}/nexus_memory.db"
    )

    CHUNK_SIZE:    int = 1000
    CHUNK_OVERLAP: int = 200
    RETRIEVAL_K:   int = 4

    MEMORY_RETRIEVAL_K:  int = 5
    MAX_MEMORY_CONTEXT:  int = 3

    model_config = {
        "env_file":        ".env",
        "env_file_encoding": "utf-8",
        "extra":           "ignore",  
        "case_sensitive":  False,
    }


settings = Settings()

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)