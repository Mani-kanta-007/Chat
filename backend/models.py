from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base
from config import EMBEDDING_DIMENSION
import uuid


def generate_uuid():
    """Generate UUID as string."""
    return str(uuid.uuid4())


class Conversation(Base):
    """Conversation model to store chat sessions."""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False, default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="conversation", cascade="all, delete-orphan")
    summaries = relationship("ConversationSummary", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """Message model to store individual chat messages."""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    model_used = Column(String, nullable=True)  # Model name for assistant messages
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    conversation = relationship("Conversation", back_populates="messages")


class Document(Base):
    """Document model to store uploaded files for RAG."""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # 'txt', 'pdf', 'docx'
    content = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    conversation = relationship("Conversation", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """Document chunks with embeddings for semantic search."""
    __tablename__ = "document_chunks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(EMBEDDING_DIMENSION))
    
    # Relationship
    document = relationship("Document", back_populates="chunks")


class ConversationSummary(Base):
    """Store conversation summaries for context window management."""
    __tablename__ = "conversation_summaries"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    summary_text = Column(Text, nullable=False)
    messages_summarized = Column(Integer, nullable=False)  # Number of messages summarized
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    conversation = relationship("Conversation", back_populates="summaries")
