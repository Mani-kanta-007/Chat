from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Conversation, Message
from datetime import datetime

router = APIRouter()


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ConversationUpdate(BaseModel):
    title: str


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    model_used: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse]
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations ordered by most recent."""
    result = await db.execute(
        select(Conversation).order_by(desc(Conversation.updated_at))
    )
    conversations = result.scalars().all()
    return conversations


@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new conversation."""
    new_conversation = Conversation(title=conversation.title)
    db.add(new_conversation)
    await db.commit()
    await db.refresh(new_conversation)
    return new_conversation


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a conversation with all its messages."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalars().first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.timestamp)
    )
    messages = messages_result.scalars().all()
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": messages
    }


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    update: ConversationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update conversation title."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalars().first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation.title = update.title
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a conversation and all its messages."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalars().first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    await db.delete(conversation)
    await db.commit()
    
    return {"message": "Conversation deleted successfully"}


@router.post("/{conversation_id}/auto_name", response_model=ConversationResponse)
async def auto_name_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Automatically generate a title for the conversation based on content."""
    from services.ollama_service import ollama_service
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalars().first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # Get first user message
    messages_result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.role == 'user'
        )
        .order_by(Message.timestamp)
        .limit(1)
    )
    first_message = messages_result.scalars().first()
    
    if not first_message:
        return conversation  # No messages yet
        
    # Generate title
    try:
        prompt = f"Generate a short, concise title (max 4-5 words) for a chat that starts with this message: '{first_message.content}'. Do not use quotes. Just the title."
        
        generated_title = await ollama_service.chat(
            model="llama3.2:latest",  # Use a fast model
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        # Clean up title
        title = generated_title.strip().strip('"').strip("'")
        if len(title) > 50:
            title = title[:47] + "..."
            
        conversation.title = title
        await db.commit()
        await db.refresh(conversation)
        
    except Exception as e:
        print(f"Error auto-naming conversation: {e}")
        
    return conversation
