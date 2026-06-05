import os
os.environ["ANONYMIZED_TELEMETRY"] = "false"
os.environ["CHROMA_TELEMETRY"]     = "false"

from sqlalchemy.orm import Session
from langchain_chroma import Chroma
from langchain.schema import Document
from database import MemoryEntry
from services.llm import get_embeddings
from config import settings
import logging
import uuid

logger = logging.getLogger(__name__)

MEMORY_COLLECTION = "nexus_long_term_memory"


def get_memory_vectorstore() -> Chroma:
    """Get or create the memory vector store."""
    return Chroma(
        collection_name=MEMORY_COLLECTION,
        embedding_function=get_embeddings(),
        persist_directory=str(settings.CHROMA_DIR),
    )


def store_memory(
    db: Session,
    session_id: str,
    fact: str,
    category: str = "general",
    confidence: float = 1.0,
    source_message: str = None,
) -> MemoryEntry:
    """Store a memory fact in both SQLite and ChromaDB."""
    embedding_id = str(uuid.uuid4())

    # Store in SQLite
    entry = MemoryEntry(
        session_id=session_id,
        fact=fact,
        category=category,
        embedding_id=embedding_id,
        confidence=confidence,
        source_message=source_message,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Store in ChromaDB for semantic search
    vectorstore = get_memory_vectorstore()
    vectorstore.add_documents(
        documents=[
            Document(
                page_content=fact,
                metadata={
                    "session_id": session_id,
                    "category": category,
                    "memory_id": str(entry.id),
                    "confidence": confidence,
                },
            )
        ],
        ids=[embedding_id],
    )

    logger.info(f"Stored memory [{category}]: {fact[:60]}...")
    return entry


def retrieve_relevant_memories(
    query: str,
    session_id: str,
    k: int = None,
) -> list[str]:
    """Retrieve semantically relevant memories for a query."""
    k = k or settings.MEMORY_RETRIEVAL_K

    try:
        vectorstore = get_memory_vectorstore()

        results = vectorstore.similarity_search_with_relevance_scores(
            query=query,
            k=k,
            filter={"session_id": session_id},
        )

        # Filter by relevance threshold
        relevant = [
            doc.page_content
            for doc, score in results
            if score > 0.3
        ]

        logger.info(
            f"Retrieved {len(relevant)} relevant memories for: '{query[:40]}'"
        )

        return relevant

    except Exception as e:
        logger.error(f"Memory retrieval failed: {e}")
        return []


def get_all_memories(db: Session, session_id: str) -> list[MemoryEntry]:
    """Get all memories for a session."""
    return (
        db.query(MemoryEntry)
        .filter(MemoryEntry.session_id == session_id)
        .order_by(MemoryEntry.created_at.desc())
        .all()
    )


def get_global_memories(db: Session) -> list[MemoryEntry]:
    """Get all memories across all sessions."""
    return (
        db.query(MemoryEntry)
        .order_by(MemoryEntry.created_at.desc())
        .limit(100)
        .all()
    )


def delete_memory(db: Session, memory_id: int) -> bool:
    """Delete a specific memory entry."""
    entry = db.query(MemoryEntry).filter(MemoryEntry.id == memory_id).first()
    if not entry:
        return False

    # Remove from ChromaDB
    if entry.embedding_id:
        try:
            vectorstore = get_memory_vectorstore()
            vectorstore.delete(ids=[entry.embedding_id])
        except Exception as e:
            logger.warning(f"Could not delete from ChromaDB: {e}")

    db.delete(entry)
    db.commit()
    return True