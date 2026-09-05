"""Long-term memory.

Facts are stored twice: as rows in `memory_entries` (what the memory panel
lists and edits) and as vectors (what recall searches). The two are kept in
step by `embedding_id`.
"""
import logging
import uuid

from sqlalchemy.orm import Session

from config import settings
from database import MemoryEntry
from services.vectorstore import add_texts, delete_ids, search

logger = logging.getLogger(__name__)

MEMORY_COLLECTION = "nexus_long_term_memory"

# Two facts whose vectors are at least this similar are treated as duplicates.
DEDUP_THRESHOLD = 0.92


def _is_duplicate(fact: str, client_id: str) -> bool:
    """True when a near-identical fact is already on file for this client."""
    if not client_id:
        return False
    try:
        hits = search(MEMORY_COLLECTION, fact, k=1, client_id=client_id)
        if hits and hits[0].score >= DEDUP_THRESHOLD:
            logger.info(f"Skipping duplicate memory: {fact[:50]}")
            return True
    except Exception as e:
        logger.warning(f"Dedup check failed: {e}")
    return False


def store_memory(
    db: Session,
    session_id: str,
    fact: str,
    category: str = "general",
    confidence: float = 1.0,
    source_message: str = None,
    client_id: str = None,
    dedup: bool = True,
) -> MemoryEntry:
    """Record a fact as a row and as a vector."""
    if dedup and _is_duplicate(fact, client_id):
        return None

    embedding_id = str(uuid.uuid4())

    entry = MemoryEntry(
        session_id=session_id,
        client_id=client_id,
        fact=fact,
        category=category,
        embedding_id=embedding_id,
        confidence=confidence,
        source_message=source_message,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    add_texts(
        collection=MEMORY_COLLECTION,
        texts=[fact],
        metadatas=[
            {
                "session_id": session_id,
                "category": category,
                "memory_id": str(entry.id),
                "confidence": confidence,
            }
        ],
        ids=[embedding_id],
        client_id=client_id,
    )

    logger.info(f"Stored memory [{category}]: {fact[:60]}")
    return entry


def retrieve_relevant_memories(
    query: str,
    session_id: str = None,
    client_id: str = None,
    k: int = None,
) -> list[str]:
    """Facts relevant to a query, scoped to one client where known.

    Client scope is what makes recall work across sessions; session scope is
    the fallback for a request that arrives without a client id.
    """
    k = k or settings.MEMORY_RETRIEVAL_K

    try:
        if client_id:
            hits = search(MEMORY_COLLECTION, query, k=k, client_id=client_id)
        else:
            hits = [
                h
                for h in search(MEMORY_COLLECTION, query, k=k * 3)
                if h.metadata.get("session_id") == session_id
            ][:k]

        relevant = [h.content for h in hits if h.score > 0.3]
        logger.info(f"Recalled {len(relevant)} memories for '{query[:40]}'")
        return relevant
    except Exception as e:
        logger.error(f"Memory recall failed: {e}")
        return []


def get_all_memories(db: Session, session_id: str) -> list[MemoryEntry]:
    """Get all memories for a session."""
    return (
        db.query(MemoryEntry)
        .filter(MemoryEntry.session_id == session_id)
        .order_by(MemoryEntry.created_at.desc())
        .all()
    )


def get_client_memories(db: Session, client_id: str) -> list[MemoryEntry]:
    """Get all memories for a client across every session (cross-session recall)."""
    if not client_id:
        return []
    return (
        db.query(MemoryEntry)
        .filter(MemoryEntry.client_id == client_id)
        .order_by(MemoryEntry.created_at.desc())
        .limit(300)
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


def update_memory(
    db: Session,
    memory_id: int,
    fact: str = None,
    category: str = None,
) -> MemoryEntry:
    """Edit a memory's fact/category and keep the vector store in sync."""
    entry = db.query(MemoryEntry).filter(MemoryEntry.id == memory_id).first()
    if not entry:
        return None

    if category is not None:
        entry.category = category

    fact_changed = fact is not None and fact.strip() and fact != entry.fact
    if fact_changed:
        entry.fact = fact.strip()

    db.commit()
    db.refresh(entry)

    # Re-embed only when the text itself changed.
    if fact_changed and entry.embedding_id:
        try:
            add_texts(
                collection=MEMORY_COLLECTION,
                texts=[entry.fact],
                metadatas=[
                    {
                        "session_id": entry.session_id,
                        "category": entry.category,
                        "memory_id": str(entry.id),
                        "confidence": entry.confidence,
                    }
                ],
                ids=[entry.embedding_id],
                client_id=entry.client_id,
            )
        except Exception as e:
            logger.warning(f"Could not re-embed updated memory: {e}")

    return entry


def delete_memory(db: Session, memory_id: int) -> bool:
    """Delete a specific memory entry."""
    entry = db.query(MemoryEntry).filter(MemoryEntry.id == memory_id).first()
    if not entry:
        return False

    if entry.embedding_id:
        try:
            delete_ids([entry.embedding_id])
        except Exception as e:
            logger.warning(f"Could not delete memory vector: {e}")

    db.delete(entry)
    db.commit()
    return True
