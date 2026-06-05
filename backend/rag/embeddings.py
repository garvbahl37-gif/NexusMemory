import os
os.environ["ANONYMIZED_TELEMETRY"] = "false"
os.environ["CHROMA_TELEMETRY"]     = "false"

from langchain_chroma import Chroma
from langchain.schema import Document
from services.llm import get_embeddings
from config import settings
import logging
import uuid

logger = logging.getLogger(__name__)


def create_collection_name(filename: str, session_id: str) -> str:
    """Generate a unique collection name for ChromaDB."""
    safe_name = "".join(c for c in filename if c.isalnum() or c in "_-")[:20]
    short_id = session_id[:8]
    return f"doc_{safe_name}_{short_id}"


def store_chunks(
    chunks: list[Document],
    collection_name: str,
) -> Chroma:
    """
    Create embeddings and store in ChromaDB.
    Returns the vector store instance.
    """
    logger.info(
        f"Storing {len(chunks)} chunks in collection: {collection_name}"
    )

    embeddings = get_embeddings()

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=collection_name,
        persist_directory=str(settings.CHROMA_DIR),
    )

    logger.info(
        f"Successfully stored chunks in ChromaDB collection: {collection_name}"
    )
    return vectorstore


def load_collection(collection_name: str) -> Chroma:
    """Load an existing ChromaDB collection."""
    embeddings = get_embeddings()
    return Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=str(settings.CHROMA_DIR),
    )


def delete_collection(collection_name: str) -> bool:
    """Delete a ChromaDB collection."""
    try:
        embeddings = get_embeddings()
        store = Chroma(
            collection_name=collection_name,
            embedding_function=embeddings,
            persist_directory=str(settings.CHROMA_DIR),
        )
        store.delete_collection()
        logger.info(f"Deleted collection: {collection_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete collection {collection_name}: {e}")
        return False