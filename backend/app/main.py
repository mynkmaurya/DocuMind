import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db, init_db
from app.models import Chunk, Conversation, Document, Message
from app.pdf_pipeline import extract_and_chunk_pdf, validate_pdf_file
from app.rag_service import stream_rag_response
from app.vector_store import get_embedding

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./storage/documents")).resolve()
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="DocuMind API",
    description="Grounded PDF Question Answering with Page-Level Citations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_stream_locks: Set[str] = set()


@app.on_event("startup")
def on_startup():
    init_db()


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = None


class MessageCreateRequest(BaseModel):
    question: Optional[str] = None
    text: Optional[str] = None


def process_pdf_in_background(document_id: str, file_path: str):
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return

        doc.status = "processing"
        db.commit()

        page_count, chunks_data = extract_and_chunk_pdf(
            file_path=file_path,
            document_id=document_id,
            chunk_size=int(os.getenv("CHUNK_SIZE_CHARS", "800")),
            chunk_overlap=int(os.getenv("CHUNK_OVERLAP_CHARS", "150")),
        )

        doc.page_count = page_count

        for item in chunks_data:
            vector = get_embedding(item["text"])
            chunk_record = Chunk(
                id=item["id"],
                document_id=document_id,
                text=item["text"],
                page_number=item["page_number"],
                chunk_order=item["chunk_order"],
            )
            chunk_record.set_embedding_list(vector)
            db.add(chunk_record)

        doc.status = "ready"
        doc.processing_error = None
        db.commit()
    except Exception as exc:
        db.rollback()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "error"
            doc.processing_error = str(exc)
            db.commit()
    finally:
        db.close()


@app.get("/")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "DocuMind API", "version": "1.0.0"}


@app.post("/api/documents")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = file.filename or "uploaded.pdf"
    content = await file.read()

    try:
        validate_pdf_file(content, filename, max_size_mb=MAX_UPLOAD_SIZE_MB)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"message": str(exc)}},
        )

    doc_id = f"doc-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    dest_path = STORAGE_DIR / f"{doc_id}_{filename}"

    with open(dest_path, "wb") as f_out:
        f_out.write(content)

    doc = Document(
        id=doc_id,
        filename=filename,
        storage_path=str(dest_path),
        size=len(content),
        page_count=None,
        status="uploading",
        processing_error=None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(process_pdf_in_background, doc_id, str(dest_path))

    return doc.to_dict()


@app.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.upload_date.desc()).all()
    return [doc.to_dict() for doc in docs]


@app.get("/api/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"message": "Document not found."}},
        )
    return doc.to_dict()


@app.get("/api/documents/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not os.path.exists(doc.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"message": "PDF file not found."}},
        )

    headers = {
        "Content-Disposition": f'inline; filename="{doc.filename}"',
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
    }
    return FileResponse(
        doc.storage_path,
        media_type="application/pdf",
        headers=headers,
    )


@app.delete("/api/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"message": "Document not found."}},
        )

    if os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"deleted": True, "id": document_id}


@app.post("/api/documents/{document_id}/conversations")
def create_conversation(
    document_id: str,
    payload: ConversationCreateRequest,
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"message": "Document not found."}},
        )

    conv_id = f"conv-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    title = (
        payload.title.strip()
        if (payload.title and payload.title.strip())
        else f"Chat on {doc.filename}"
    )

    conv = Conversation(
        id=conv_id,
        document_id=document_id,
        title=title,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv.to_dict()


@app.get("/api/documents/{document_id}/conversations")
def list_conversations(document_id: str, db: Session = Depends(get_db)):
    convs = (
        db.query(Conversation)
        .filter(Conversation.document_id == document_id)
        .order_by(Conversation.created_date.desc())
        .all()
    )
    return [c.to_dict() for c in convs]


@app.get("/api/conversations/{conversation_id}/messages")
def get_messages(conversation_id: str, db: Session = Depends(get_db)):
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.timestamp.asc())
        .all()
    )
    return [m.to_dict() for m in msgs]


@app.post("/api/conversations/{conversation_id}/messages")
async def stream_message(
    conversation_id: str,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
):
    question = (payload.question or payload.text or "").strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"message": "Question text is required."}},
        )

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"message": "Conversation not found."}},
        )

    if conversation_id in active_stream_locks:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "message": "A question is already being streamed for this conversation. Please wait for it to complete."
                }
            },
        )

    active_stream_locks.add(conversation_id)

    async def stream_wrapper():
        try:
            async for chunk in stream_rag_response(db, conv, question):
                yield chunk
        finally:
            active_stream_locks.discard(conversation_id)

    return StreamingResponse(
        stream_wrapper(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
