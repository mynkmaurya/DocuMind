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
