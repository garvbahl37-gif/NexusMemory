from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, ChatSession, ChatMessage, UploadedDocument
from memory.store import retrieve_relevant_memories, store_memory
from memory.extractor import extract_memories_from_conversation
from rag.retriever import retrieve_relevant_chunks, format_context_from_docs
from services.llm import get_llm
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableSequence
import uuid
import json
import logging
from datetime import datetime
from config import settings
from typing import Optional
router = APIRouter()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Nexus Memory, an intelligent AI assistant with persistent memory.

You have access to:
1. Long-term memories about the user from previous conversations
2. Relevant context from uploaded documents (if available)

Instructions:
- Use the provided memories naturally in your responses
- When answering from documents, cite the source
- Be conversational, helpful, and technically precise
- If you reference a memory, you can mention "I remember you mentioned..."
- Keep responses clear and well-formatted using markdown when appropriate

{memory_context}

{document_context}"""


class ChatRequest(BaseModel):
    message:    str
    session_id: Optional[str] = None  
    model:      Optional[str] = None
    stream:     bool = True


class ChatResponse(BaseModel):
    response: str
    session_id: str
    memories_used: int
    docs_retrieved: int


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    # Create or get session
    session_id = request.session_id or str(uuid.uuid4())

    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id
    ).first()

    if not session:
        session = ChatSession(
            session_id=session_id,
            title=request.message[:40] + "..." if len(request.message) > 40 else request.message,
        )
        db.add(session)
        db.commit()

    # Store user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    db.commit()

    # Retrieve relevant memories
    memories = retrieve_relevant_memories(
        query=request.message,
        session_id=session_id,
        k=settings.MAX_MEMORY_CONTEXT,
    )

    memory_context = ""
    if memories:
        memory_list = "\n".join(f"- {m}" for m in memories)
        memory_context = f"### Relevant Memories About User:\n{memory_list}"

    # Retrieve relevant document chunks
    doc_context = ""
    docs_retrieved = 0

    documents = (
        db.query(UploadedDocument)
        .filter(UploadedDocument.session_id == session_id)
        .all()
    )

    if documents:
        all_chunks = []
        for doc in documents:
            chunks = retrieve_relevant_chunks(
                query=request.message,
                collection_name=doc.collection_name,
                k=2,
            )
            all_chunks.extend(chunks)

        if all_chunks:
            docs_retrieved = len(all_chunks)
            context_text = format_context_from_docs(all_chunks[:settings.RETRIEVAL_K])
            doc_context = f"### Context From Your Documents:\n{context_text}"

    # Get recent conversation history
    recent_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_messages.reverse()

    # Build conversation for history
    conversation_history = []
    for msg in recent_messages[:-1]:  # Exclude the message we just added
        conversation_history.append({
            "role": msg.role,
            "content": msg.content,
        })

    # Build the system message
    system_message = SYSTEM_PROMPT.format(
        memory_context=memory_context,
        document_context=doc_context,
    )

    # Build LangChain messages
    prompt_messages = [("system", system_message)]
    for msg in conversation_history[-6:]:
        prompt_messages.append((msg["role"], msg["content"]))
    prompt_messages.append(("human", "{user_input}"))

    prompt = ChatPromptTemplate.from_messages(prompt_messages)

    model_name = request.model or settings.OLLAMA_MODEL

    if request.stream:
        # Streaming response
        async def generate():
            full_response = ""
            llm = get_llm(model=model_name, streaming=True)
            chain = prompt | llm

            try:
                # Send metadata first
                metadata = json.dumps({
                    "type": "metadata",
                    "session_id": session_id,
                    "memories_used": len(memories),
                    "docs_retrieved": docs_retrieved,
                })
                yield f"data: {metadata}\n\n"

                # Stream tokens
                async for chunk in chain.astream({"user_input": request.message}):
                    if chunk:
                        full_response += chunk
                        token_data = json.dumps({
                            "type": "token",
                            "content": chunk,
                        })
                        yield f"data: {token_data}\n\n"

                # Store assistant response
                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=full_response,
                )
                db.add(assistant_msg)
                db.commit()

                # Extract and store memories asynchronously
                all_msgs = conversation_history + [
                    {"role": "user", "content": request.message},
                    {"role": "assistant", "content": full_response},
                ]

                new_memories = extract_memories_from_conversation(all_msgs)
                for mem in new_memories:
                    store_memory(
                        db=db,
                        session_id=session_id,
                        fact=mem["fact"],
                        category=mem["category"],
                        source_message=request.message,
                    )

                # Send done signal
                done_data = json.dumps({"type": "done"})
                yield f"data: {done_data}\n\n"

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                error_data = json.dumps({
                    "type": "error",
                    "content": f"An error occurred: {str(e)}",
                })
                yield f"data: {error_data}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    else:
        # Non-streaming response
        try:
            llm = get_llm(model=model_name, streaming=False)
            chain = prompt | llm
            response = chain.invoke({"user_input": request.message})

            # Store response
            assistant_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=str(response),
            )
            db.add(assistant_msg)
            db.commit()

            return ChatResponse(
                response=str(response),
                session_id=session_id,
                memories_used=len(memories),
                docs_retrieved=docs_retrieved,
            )

        except Exception as e:
            logger.error(f"Chat error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/sessions")
async def get_sessions(db: Session = Depends(get_db)):
    """Get all chat sessions."""
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "session_id": s.session_id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


@router.get("/chat/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get all messages for a session."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "timestamp": m.timestamp.isoformat(),
        }
        for m in messages
    ]


@router.delete("/chat/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Delete a chat session and its messages."""
    db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).delete()
    db.query(ChatSession).filter(
        ChatSession.session_id == session_id
    ).delete()
    db.commit()
    return {"status": "deleted"}