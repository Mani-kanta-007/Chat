from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from models import Document, DocumentChunk
from services.ollama_service import ollama_service
from config import CHUNK_SIZE, CHUNK_OVERLAP, TOP_K_DOCUMENTS
import os
import PyPDF2
from docx import Document as DocxDocument
import io


class RAGService:
    """Service for RAG (Retrieval Augmented Generation)."""
    
    async def process_document(
        self,
        db: AsyncSession,
        conversation_id: str,
        filename: str,
        file_content: bytes
    ) -> str:
        """Process and store a document with embeddings."""
        
        # Determine file type
        file_ext = os.path.splitext(filename)[1].lower()
        
        # Extract text based on file type
        if file_ext == '.txt':
            text_content = file_content.decode('utf-8')
        elif file_ext == '.pdf':
            text_content = await self._extract_pdf_text(file_content)
        elif file_ext == '.docx':
            text_content = await self._extract_docx_text(file_content)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        # Create document record
        document = Document(
            conversation_id=conversation_id,
            filename=filename,
            file_type=file_ext[1:],  # Remove the dot
            content=text_content
        )
        db.add(document)
        await db.flush()  # Get document ID
        
        # Chunk the text
        chunks = self._chunk_text(text_content)
        
        # Generate embeddings and store chunks
        for idx, chunk_text in enumerate(chunks):
            embedding = await ollama_service.generate_embedding(chunk_text)
            
            chunk = DocumentChunk(
                document_id=document.id,
                chunk_text=chunk_text,
                chunk_index=idx,
                embedding=embedding
            )
            db.add(chunk)
        
        await db.commit()
        return document.id
    
    async def search_relevant_chunks(
        self,
        db: AsyncSession,
        conversation_id: str,
        query: str,
        top_k: int = TOP_K_DOCUMENTS
    ) -> List[str]:
        """Search for relevant document chunks using semantic similarity."""
        
        # Generate query embedding
        query_embedding = await ollama_service.generate_embedding(query)
        
        if not query_embedding:
            return []
        
        # Query for similar chunks using pgvector
        # Get all documents for this conversation
        result = await db.execute(
            select(Document).where(Document.conversation_id == conversation_id)
        )
        documents = result.scalars().all()
        
        if not documents:
            return []
        
        document_ids = [doc.id for doc in documents]
        
        # Search for similar chunks using cosine similarity
        query_text = text("""
            SELECT chunk_text, 1 - (embedding <=> :query_embedding) as similarity
            FROM document_chunks
            WHERE document_id = ANY(:document_ids)
            ORDER BY embedding <=> :query_embedding
            LIMIT :top_k
        """)
        
        result = await db.execute(
            query_text,
            {
                "query_embedding": query_embedding,
                "document_ids": document_ids,
                "top_k": top_k
            }
        )
        
        chunks = [row[0] for row in result.fetchall()]
        return chunks
    
    async def get_conversation_documents(
        self,
        db: AsyncSession,
        conversation_id: str
    ) -> List[dict]:
        """Get all documents for a conversation."""
        result = await db.execute(
            select(Document).where(Document.conversation_id == conversation_id)
        )
        documents = result.scalars().all()
        
        return [
            {
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "uploaded_at": doc.uploaded_at.isoformat()
            }
            for doc in documents
        ]
    
    async def delete_document(
        self,
        db: AsyncSession,
        document_id: str
    ) -> bool:
        """Delete a document and its chunks."""
        result = await db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalars().first()
        
        if document:
            await db.delete(document)
            await db.commit()
            return True
        return False
    
    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
            chunk = ' '.join(words[i:i + CHUNK_SIZE])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    async def _extract_pdf_text(self, file_content: bytes) -> str:
        """Extract text from PDF."""
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    
    async def _extract_docx_text(self, file_content: bytes) -> str:
        """Extract text from DOCX."""
        docx_file = io.BytesIO(file_content)
        doc = DocxDocument(docx_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text.strip()


# Singleton instance
rag_service = RAGService()
