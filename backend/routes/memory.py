from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, MemoryEntry
from memory.store import (
    store_memory,
    get_all_memories,
    get_global_memories,
    delete_memory,
)

router = APIRouter()


class ManualMemoryRequest(BaseModel):
    session_id: str
    fact: str
    category: str = "general"


@router.get("/memory/{session_id}")
async def get_memories(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get all memories for a session."""
    memories = get_all_memories(db=db, session_id=session_id)

    return {
        "session_id": session_id,
        "total": len(memories),
        "memories": [
            {
                "id": m.id,
                "fact": m.fact,
                "category": m.category,
                "confidence": m.confidence,
                "created_at": m.created_at.isoformat(),
            }
            for m in memories
        ],
    }


@router.get("/memory")
async def get_all_memories_global(db: Session = Depends(get_db)):
    """Get all memories across all sessions (global view)."""
    memories = get_global_memories(db=db)

    # Group by session
    sessions = {}
    for m in memories:
        if m.session_id not in sessions:
            sessions[m.session_id] = []
        sessions[m.session_id].append({
            "id": m.id,
            "fact": m.fact,
            "category": m.category,
            "confidence": m.confidence,
            "created_at": m.created_at.isoformat(),
        })

    return {
        "total": len(memories),
        "sessions": sessions,
    }


@router.post("/memory")
async def add_memory_manually(
    request: ManualMemoryRequest,
    db: Session = Depends(get_db),
):
    """Manually add a memory entry."""
    entry = store_memory(
        db=db,
        session_id=request.session_id,
        fact=request.fact,
        category=request.category,
        confidence=1.0,
    )

    return {
        "status": "stored",
        "id": entry.id,
        "fact": entry.fact,
        "category": entry.category,
    }


@router.delete("/memory/{memory_id}")
async def remove_memory(
    memory_id: int,
    db: Session = Depends(get_db),
):
    """Delete a specific memory entry."""
    success = delete_memory(db=db, memory_id=memory_id)

    if not success:
        raise HTTPException(status_code=404, detail="Memory not found.")

    return {"status": "deleted", "id": memory_id}