from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
from database import get_db
from services.rag_service import rag_service

router = APIRouter()


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    uploaded_at: str


@router.post("/upload")
async def upload_document(
    conversation_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and process a document for RAG."""
    
    # Validate file type
    allowed_extensions = ['.txt', '.pdf', '.docx']
    file_ext = '.' + file.filename.split('.')[-1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Read file content
    file_content = await file.read()
    
    try:
        # Process document
        document_id = await rag_service.process_document(
            db, conversation_id, file.filename, file_content
        )
        
        return {
            "message": "Document uploaded and processed successfully",
            "document_id": document_id,
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.get("/{conversation_id}", response_model=List[DocumentResponse])
async def get_documents(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all documents for a conversation."""
    documents = await rag_service.get_conversation_documents(db, conversation_id)
    return documents


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a document and its embeddings."""
    success = await rag_service.delete_document(db, document_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}
