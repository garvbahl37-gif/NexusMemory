"""Document chunk storage — a thin naming layer over the vector store."""
import logging

from langchain_core.documents import Document

from services.vectorstore import add_texts, drop_collection

logger = logging.getLogger(__name__)


def create_collection_name(filename: str, session_id: str) -> str:
    """A collection name unique to this file within this session."""
    safe_name = "".join(c for c in filename if c.isalnum() or c in "_-")[:20]
    return f"doc_{safe_name}_{session_id[:8]}"


def store_chunks(chunks: list[Document], collection_name: str) -> int:
    """Embed and store a document's chunks. Returns how many were written."""
    ids = add_texts(
        collection=collection_name,
        texts=[c.page_content for c in chunks],
        metadatas=[c.metadata for c in chunks],
    )
    return len(ids)


def delete_collection(collection_name: str) -> bool:
    return drop_collection(collection_name)
