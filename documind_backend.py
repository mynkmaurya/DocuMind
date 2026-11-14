# ============================================================================
# FILE: backend/schema.sql
# ============================================================================
# -- DocuMind Database Schema (PostgreSQL & SQLite Compatible)
# CREATE TABLE IF NOT EXISTS documents (
#     id VARCHAR(64) PRIMARY KEY,
#     filename VARCHAR(255) NOT NULL,
#     storage_path VARCHAR(512) NOT NULL,
#     size BIGINT NOT NULL,
#     page_count INTEGER,
#     status VARCHAR(32) NOT NULL DEFAULT 'uploading',
#     upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
#     processing_error TEXT
# );
# 
# CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
# 
# CREATE TABLE IF NOT EXISTS chunks (
#     id VARCHAR(64) PRIMARY KEY,
#     document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
#     text TEXT NOT NULL,
#     page_number INTEGER NOT NULL,
#     chunk_order INTEGER NOT NULL,
#     embedding TEXT
# );
# 
# CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
# CREATE INDEX IF NOT EXISTS idx_chunks_page_number ON chunks(page_number);
# 
# CREATE TABLE IF NOT EXISTS conversations (
#     id VARCHAR(64) PRIMARY KEY,
#     document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
#     title VARCHAR(255) NOT NULL,
#     created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
# );
# 
# CREATE INDEX IF NOT EXISTS idx_conversations_document_id ON conversations(document_id);
# 
# CREATE TABLE IF NOT EXISTS messages (
#     id VARCHAR(64) PRIMARY KEY,
#     conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
#     role VARCHAR(16) NOT NULL,
#     text TEXT NOT NULL,
#     timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
#     citations TEXT
# );
# 
# CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

# ============================================================================
# FILE: backend/app/database.py
# ============================================================================
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./storage/documind.db")

if DATABASE_URL.startswith("sqlite"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not db_path.startswith(":memory:"):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        future=True,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        future=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

# ============================================================================
# FILE: backend/app/models.py
# ============================================================================
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    size = Column(Integer, nullable=False)
    page_count = Column(Integer, nullable=True)
    status = Column(String(32), nullable=False, default="uploading", index=True)
    upload_date = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    processing_error = Column(Text, nullable=True)

    chunks = relationship(
        "Chunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="Chunk.chunk_order",
    )
    conversations = relationship(
        "Conversation",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="Conversation.created_date.desc()",
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "filename": self.filename,
            "size": self.size,
            "page_count": self.page_count,
            "status": self.status,
            "upload_date": (
                self.upload_date.isoformat() if self.upload_date else None
            ),
            "processing_error": self.processing_error,
            "chunk_count": len(self.chunks) if self.chunks is not None else 0,
        }


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(
        String(64),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=False, index=True)
    chunk_order = Column(Integer, nullable=False)
    embedding = Column(Text, nullable=True)

    document = relationship("Document", back_populates="chunks")

    def get_embedding_list(self) -> Optional[List[float]]:
        if not self.embedding:
            return None
        try:
            return json.loads(self.embedding)
        except Exception:
            return None

    def set_embedding_list(self, vector: List[float]) -> None:
        self.embedding = json.dumps(vector)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "text": self.text,
            "page_number": self.page_number,
            "chunk_order": self.chunk_order,
        }


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(
        String(64),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    created_date = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    document = relationship("Document", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.timestamp.asc()",
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "title": self.title,
            "created_date": (
                self.created_date.isoformat() if self.created_date else None
            ),
        }


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(
        String(64),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(16), nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    citations = Column(Text, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")

    def get_citations_list(self) -> List[Dict[str, Any]]:
        if not self.citations:
            return []
        try:
            return json.loads(self.citations)
        except Exception:
            return []

    def set_citations_list(self, citations_list: List[Dict[str, Any]]) -> None:
        self.citations = json.dumps(citations_list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "text": self.text,
            "timestamp": (
                self.timestamp.isoformat() if self.timestamp else None
            ),
            "citations": self.get_citations_list(),
        }

# ============================================================================
# FILE: backend/app/pdf_pipeline.py
# ============================================================================
import os
import re
from typing import Dict, List, Tuple
from pypdf import PdfReader


def validate_pdf_file(
    file_bytes: bytes,
    filename: str,
    max_size_mb: int = 25,
) -> None:
    if not filename.lower().endswith(".pdf"):
        raise ValueError("Invalid file format. Only .pdf files are supported.")

    max_bytes = max_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise ValueError(
            f"File size exceeds the maximum limit of {max_size_mb} MB."
        )

    if not file_bytes.startswith(b"%PDF-"):
        raise ValueError("Corrupted or invalid PDF header. Magic bytes %PDF- not found.")


def split_text_into_chunks(
    text: str,
    page_number: int,
    document_id: str,
    start_order: int,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> Tuple[List[Dict], int]:
    clean_text = re.sub(r"[ \t]+", " ", text).strip()
    if not clean_text:
        return [], start_order

    chunks: List[Dict] = []
    order = start_order
    start = 0
    total_len = len(clean_text)

    while start < total_len:
        end = start + chunk_size

        if end >= total_len:
            chunk_slice = clean_text[start:total_len].strip()
            if chunk_slice:
                chunks.append({
                    "id": f"{document_id}-p{page_number}-c{order}",
                    "document_id": document_id,
                    "text": chunk_slice,
                    "page_number": page_number,
                    "chunk_order": order,
                })
                order += 1
            break

        search_window = clean_text[end - chunk_overlap : end + 50]
        sentence_break = -1
        for match in re.finditer(r"([.!?])\s+", search_window):
            sentence_break = end - chunk_overlap + match.end()

        if sentence_break > start and sentence_break <= end + 50:
            actual_end = sentence_break
        else:
            space_pos = clean_text.rfind(" ", start, end)
            if space_pos > start + (chunk_size // 2):
                actual_end = space_pos
            else:
                actual_end = end

        chunk_slice = clean_text[start:actual_end].strip()
        if chunk_slice:
            chunks.append({
                "id": f"{document_id}-p{page_number}-c{order}",
                "document_id": document_id,
                "text": chunk_slice,
                "page_number": page_number,
                "chunk_order": order,
            })
            order += 1

        start = max(start + 1, actual_end - chunk_overlap)

    return chunks, order


def extract_and_chunk_pdf(
    file_path: str,
    document_id: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> Tuple[int, List[Dict]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at {file_path}")

    try:
        reader = PdfReader(file_path)
    except Exception as exc:
        raise ValueError(f"Failed to read PDF document: {exc}") from exc

    if reader.is_encrypted:
        raise ValueError(
            "Encrypted or password-protected PDFs are not supported."
        )

    page_count = len(reader.pages)
    if page_count == 0:
        raise ValueError("The uploaded PDF has 0 pages.")

    all_chunks: List[Dict] = []
    total_characters = 0
    current_order = 0

    for i, page in enumerate(reader.pages):
        page_num = i + 1
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""

        page_text = page_text.strip()
        total_characters += len(page_text)

        if page_text:
            chunks, current_order = split_text_into_chunks(
                text=page_text,
                page_number=page_num,
                document_id=document_id,
                start_order=current_order,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
            all_chunks.extend(chunks)

    if total_characters < 15 or len(all_chunks) == 0:
        raise ValueError(
            "No extractable text was found in this PDF. Scanned image PDFs "
            "without OCR are not supported in this version."
        )

    return page_count, all_chunks

# ============================================================================
# FILE: backend/app/vector_store.py
# ============================================================================
import hashlib
import json
import math
import os
import re
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models import Chunk

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_EMBEDDING_MODEL = os.getenv(
    "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
)

openai_client = None
if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-your-"):
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        openai_client = None


def generate_hashed_ngram_embedding(text: str, dim: int = 256) -> List[float]:
    clean = re.sub(r"\s+", " ", text.lower().strip())
    vector = [0.0] * dim
    if not clean:
        vector[0] = 1.0
        return vector

    for i in range(max(1, len(clean) - 2)):
        tri = clean[i : i + 3]
        h_bytes = hashlib.md5(tri.encode("utf-8")).digest()
        idx = int.from_bytes(h_bytes[:4], "little") % dim
        sign = 1.0 if (h_bytes[4] % 2 == 0) else -1.0
        vector[idx] += sign

    words = re.findall(r"\b[a-z0-9_]{3,}\b", clean)
    for word in words:
        h_bytes = hashlib.sha256(word.encode("utf-8")).digest()
        idx = int.from_bytes(h_bytes[:4], "little") % dim
        sign = 1.0 if (h_bytes[4] % 2 == 0) else -1.0
        vector[idx] += sign * 1.5

    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]
    else:
        vector[0] = 1.0

    return vector


def get_embedding(text: str) -> List[float]:
    global openai_client
    if openai_client:
        try:
            resp = openai_client.embeddings.create(
                input=text,
                model=OPENAI_EMBEDDING_MODEL,
            )
            return resp.data[0].embedding
        except Exception as exc:
            print(f"[vector_store] OpenAI embedding failed ({exc}); falling back to local hashing.")

    return generate_hashed_ngram_embedding(text)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b:
        return 0.0

    min_len = min(len(vec_a), len(vec_b))
    dot = sum(vec_a[i] * vec_b[i] for i in range(min_len))
    norm_a = math.sqrt(sum(x * x for x in vec_a[:min_len]))
    norm_b = math.sqrt(sum(y * y for y in vec_b[:min_len]))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot / (norm_a * norm_b)))


def retrieve_top_k(
    db: Session,
    document_id: str,
    query: str,
    top_k: int = 5,
) -> List[Tuple[Chunk, float]]:
    chunks = db.query(Chunk).filter(Chunk.document_id == document_id).all()
    if not chunks:
        return []

    query_vec = get_embedding(query)
    q_words = set(re.findall(r"\b[a-z0-9_]{3,}\b", query.lower()))

    scored_chunks: List[Tuple[Chunk, float]] = []
    for chunk in chunks:
        chunk_vec = chunk.get_embedding_list()
        sim = cosine_similarity(query_vec, chunk_vec) if chunk_vec else 0.0

        chunk_words = set(re.findall(r"\b[a-z0-9_]{3,}\b", chunk.text.lower()))
        overlap = len(q_words & chunk_words)
        lexical_boost = min(0.3, overlap * 0.08)

        total_score = sim + lexical_boost
        scored_chunks.append((chunk, total_score))

    scored_chunks.sort(key=lambda item: item[1], reverse=True)
    return scored_chunks[:top_k]

# ============================================================================
# FILE: backend/app/rag_service.py
# ============================================================================
import asyncio
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models import Chunk, Conversation, Message
from app.vector_store import openai_client, retrieve_top_k

OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
TOP_K_CHUNKS = int(os.getenv("TOP_K_CHUNKS", "5"))


def format_sse(event: str, data: Any) -> str:
    json_data = json.dumps(data) if not isinstance(data, str) else data
    return f"event: {event}\ndata: {json_data}\n\n"


async def stream_rag_response(
    db: Session,
    conversation: Conversation,
    question: str,
) -> AsyncGenerator[str, None]:
    doc_id = conversation.document_id
    now_utc = datetime.now(timezone.utc)

    user_msg_id = f"user-{int(now_utc.timestamp() * 1000)}"
    user_message = Message(
        id=user_msg_id,
        conversation_id=conversation.id,
        role="user",
        text=question,
        timestamp=now_utc,
        citations=None,
    )
    db.add(user_message)
    db.commit()

    scored_chunks = retrieve_top_k(db, doc_id, question, top_k=TOP_K_CHUNKS)
    valid_chunks_map: Dict[str, Chunk] = {
        chunk.id: chunk for chunk, _ in scored_chunks
    }

    assistant_msg_id = f"assistant-{int(datetime.now(timezone.utc).timestamp() * 1000)}"

    is_unanswerable = (
        len(scored_chunks) == 0
        or all(score < 0.05 for _, score in scored_chunks)
    )

    if is_unanswerable:
        fallback_text = (
            "The uploaded document does not contain enough information to answer this question."
        )
        words = fallback_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield format_sse("token", {"token": token})
            await asyncio.sleep(0.02)

        yield format_sse("citations", [])
        yield format_sse(
            "done",
            {"message_id": assistant_msg_id, "full_text": fallback_text},
        )

        asst_msg = Message(
            id=assistant_msg_id,
            conversation_id=conversation.id,
            role="assistant",
            text=fallback_text,
            timestamp=datetime.now(timezone.utc),
            citations=json.dumps([]),
        )
        db.add(asst_msg)
        db.commit()
        return

    passages = []
    for chunk, _ in scored_chunks:
        passages.append(
            f"[CHUNK:{chunk.id}] (Page {chunk.page_number}):\n{chunk.text}"
        )
    context_text = "\n\n---\n\n".join(passages)

    raw_response_text = ""

    if openai_client:
        system_instruction = (
            "You are DocuMind, an assistant strictly answering questions grounded in the provided document passages. "
            "Rules:\n"
            "1. Answer ONLY using information explicitly stated in the passages.\n"
            "2. Whenever you state a fact or point, cite the source chunk with [CHUNK:<id>] right after it.\n"
            "3. If the passages do not contain enough information to answer, state: "
            "'The uploaded document does not contain enough information to answer this question.'\n"
            "4. Do NOT cite any chunk ID that was not provided."
        )

        user_content = (
            f"Passages:\n{context_text}\n\n"
            f"Question: {question}"
        )

        try:
            stream = openai_client.chat.completions.create(
                model=OPENAI_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_content},
                ],
                stream=True,
                temperature=0.2,
            )

            for chunk_resp in stream:
                delta = chunk_resp.choices[0].delta.content or ""
                if delta:
                    raw_response_text += delta
                    yield format_sse("token", {"token": delta})
                    await asyncio.sleep(0.005)

        except Exception as exc:
            print(f"[rag_service] OpenAI chat streaming error: {exc}. Using deterministic local synthesis.")
            raw_response_text = ""

    if not raw_response_text:
        top_chunks = [c for c, _ in scored_chunks[:3]]
        parts = []
        for c in top_chunks:
            snippet = c.text.strip().replace("\n", " ")
            if len(snippet) > 220:
                snippet = snippet[:220].rsplit(" ", 1)[0] + "..."
            parts.append(
                f"Based on Page {c.page_number}, {snippet} [CHUNK:{c.id}]"
            )
        raw_response_text = " ".join(parts)

        words = raw_response_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield format_sse("token", {"token": token})
            await asyncio.sleep(0.025)

    cited_ids = re.findall(r"\[CHUNK:([^\]]+)\]", raw_response_text)
    verified_citations: List[Dict] = []
    seen_chunks = set()

    clean_text = raw_response_text
    for cid in cited_ids:
        if cid in valid_chunks_map:
            matched_chunk = valid_chunks_map[cid]
            clean_text = clean_text.replace(
                f"[CHUNK:{cid}]", f"[Page {matched_chunk.page_number}]"
            )
            if cid not in seen_chunks:
                seen_chunks.add(cid)
                verified_citations.append({
                    "chunk_id": matched_chunk.id,
                    "document_id": matched_chunk.document_id,
                    "page_number": matched_chunk.page_number,
                    "excerpt": matched_chunk.text[:280].strip(),
                })
        else:
            clean_text = clean_text.replace(f"[CHUNK:{cid}]", "")

    clean_text = re.sub(r" +", " ", clean_text).strip()

    yield format_sse("citations", verified_citations)
    yield format_sse(
        "done",
        {"message_id": assistant_msg_id, "full_text": clean_text},
    )

    asst_msg = Message(
        id=assistant_msg_id,
        conversation_id=conversation.id,
        role="assistant",
        text=clean_text,
        timestamp=datetime.now(timezone.utc),
        citations=json.dumps(verified_citations),
    )
    db.add(asst_msg)
    db.commit()

# ============================================================================
# FILE: backend/app/main.py
# ============================================================================
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
