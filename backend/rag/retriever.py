"""Document retrieval."""
import logging

from langchain_core.documents import Document

from config import settings
from services.vectorstore import search

logger = logging.getLogger(__name__)


def retrieve_relevant_chunks(
    query: str,
    collection_name: str,
    k: int = None,
) -> list[Document]:
    """Most relevant chunks for a query.

    Uses maximal marginal relevance so the context is not four near-copies of
    the same paragraph.
    """
    k = k or settings.RETRIEVAL_K

    try:
        hits = search(collection_name, query, k=k, use_mmr=True)
        logger.info(f"Retrieved {len(hits)} chunks for '{query[:50]}'")
        return [
            Document(page_content=h.content, metadata=h.metadata) for h in hits
        ]
    except Exception as e:
        logger.error(f"Retrieval failed for '{collection_name}': {e}")
        return []


def format_context_from_docs(docs: list[Document]) -> str:
    """Render retrieved chunks as labelled context for the prompt."""
    if not docs:
        return ""

    parts = []
    for i, doc in enumerate(docs, 1):
        source_info = ""
        if "source" in doc.metadata:
            filename = str(doc.metadata["source"]).split("/")[-1]
            page = doc.metadata.get("page", 0)
            source_info = f"[Source: {filename}, Page {page + 1}]"
        parts.append(f"--- Context {i} {source_info} ---\n{doc.page_content}")

    return "\n\n".join(parts)
