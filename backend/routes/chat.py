from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Message, Conversation
from services.ollama_service import ollama_service
from services.rag_service import rag_service
from services.web_search_service import web_search_service
from services.context_manager import context_manager
from sqlalchemy import select
import json
import re

router = APIRouter()


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    model: str
    use_rag: bool = False
    use_web_search: bool = False


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Stream chat responses with SSE."""
    
    async def generate():
        try:
            # Get conversation context with summarization
            context_messages, was_summarized = await context_manager.get_context_messages(
                db, request.conversation_id, request.model
            )
            
            # Save user message to DB (after getting context to avoid duplication)
            user_message = Message(
                conversation_id=request.conversation_id,
                role="user",
                content=request.message
            )
            db.add(user_message)
            await db.commit()
            
            # Extract images and clean content for processing
            images = []
            img_matches = re.finditer(r'!\[.*?\]\(data:image\/.*?;base64,(.*?)\)', request.message)
            for match in img_matches:
                images.append(match.group(1))
            
            clean_message = re.sub(r'!\[.*?\]\(data:image\/.*?;base64,.*?\)', '[Image]', request.message)
            
            # Prepare the current message for Ollama
            current_message = {
                "role": "user", 
                "content": clean_message,
                "images": images if images else None
            }
            
            # Add RAG context if enabled using clean message
            rag_context = ""
            if request.use_rag:
                relevant_chunks = await rag_service.search_relevant_chunks(
                    db, request.conversation_id, clean_message
                )
                if relevant_chunks:
                    rag_context = "### Relevant Documents:\n\n"
                    for i, chunk in enumerate(relevant_chunks, 1):
                        rag_context += f"**Document {i}:**\n{chunk}\n\n"
                    rag_context += "---\n\n"
            
            # Add web search context if enabled using clean message
            web_context = ""
            if request.use_web_search:
                search_results = await web_search_service.search(clean_message)
                web_context = web_search_service.format_search_context(search_results)
            
            # Combine contexts
            enhanced_message = ""
            if rag_context or web_context:
                enhanced_message = f"{web_context}{rag_context}User Query: {clean_message}"
                current_message["content"] = enhanced_message
            
            # Build final message list
            messages = context_messages + [current_message]
            
            # Send metadata about context
            metadata = {
                "was_summarized": was_summarized,
                "used_rag": bool(rag_context),
                "used_web_search": bool(web_context)
            }
            yield f"data: {json.dumps({'type': 'metadata', 'data': metadata})}\n\n"
            
            # Stream the response
            assistant_response = ""
            async for chunk in ollama_service.chat_stream(request.model, messages):
                assistant_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Save assistant message
            assistant_message = Message(
                conversation_id=request.conversation_id,
                role="assistant",
                content=assistant_response,
                model_used=request.model
            )
            db.add(assistant_message)
            
            # Update conversation timestamp
            result = await db.execute(
                select(Conversation).where(Conversation.id == request.conversation_id)
            )
            conversation = result.scalars().first()
            if conversation:
                # This will trigger the onupdate for updated_at
                conversation.title = conversation.title
            
            await db.commit()
            
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            error_message = f"Error: {str(e)}"
            yield f"data: {json.dumps({'type': 'error', 'content': error_message})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Non-streaming chat endpoint (alternative)."""
    
    try:
        # Get conversation context
        context_messages, was_summarized = await context_manager.get_context_messages(
            db, request.conversation_id, request.model
        )
        
        # Save user message
        user_message = Message(
            conversation_id=request.conversation_id,
            role="user",
            content=request.message
        )
        db.add(user_message)
        await db.commit()
        
        # Extract images and clean content for processing
        images = []
        img_matches = re.finditer(r'!\[.*?\]\(data:image\/.*?;base64,(.*?)\)', request.message)
        for match in img_matches:
            images.append(match.group(1))
        
        clean_message = re.sub(r'!\[.*?\]\(data:image\/.*?;base64,.*?\)', '[Image]', request.message)
        
        # Prepare the current message
        current_message = {
            "role": "user", 
            "content": clean_message,
            "images": images if images else None
        }
        
        # Add current message
        messages = context_messages + [current_message]
        
        # Get response
        response = await ollama_service.chat(request.model, messages)
        
        # Save assistant message
        assistant_message = Message(
            conversation_id=request.conversation_id,
            role="assistant",
            content=response,
            model_used=request.model
        )
        db.add(assistant_message)
        await db.commit()
        
        return {
            "response": response,
            "was_summarized": was_summarized
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
