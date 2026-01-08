from typing import List, Dict, Tuple
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models import Message, ConversationSummary
from services.ollama_service import ollama_service
from config import settings, MODEL_CONFIGS, SUMMARY_TRIGGER_PERCENTAGE, SUMMARY_COMPRESSION_RATIO


class ContextManager:
    """Manage conversation context with intelligent summarization."""
    
    def _strip_images(self, content: str) -> str:
        """Remove base64 images from content to save tokens."""
        if not content:
            return ""
        return re.sub(r'!\[.*?\]\(data:image\/.*?;base64,.*?\)', '[Image]', content)
    
    async def get_context_messages(
        self,
        db: AsyncSession,
        conversation_id: str,
        model: str
    ) -> Tuple[List[dict], bool]:
        """
        Get messages for context, with summarization if needed.
        Returns (messages, was_summarized)
        """
        # Get model's context window
        context_window = MODEL_CONFIGS.get(model, {}).get('context_window', settings.default_context_window)
        max_tokens = int(context_window * SUMMARY_TRIGGER_PERCENTAGE)
        
        # Get all messages
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.timestamp)
        )
        messages = result.scalars().all()
        
        if not messages:
            return [], False
        
        # Convert to dict format and strip images to save tokens
        message_dicts = [
            {"role": msg.role, "content": self._strip_images(msg.content)}
            for msg in messages
        ]
        
        # Count tokens
        total_tokens = ollama_service.count_messages_tokens(message_dicts)
        
        # If within limits, return as is
        if total_tokens <= max_tokens:
            return message_dicts, False
        
        # Need to summarize
        summarized_messages = await self._summarize_and_compress(
            db, conversation_id, message_dicts, max_tokens, model
        )
        
        return summarized_messages, True
    
    async def _summarize_and_compress(
        self,
        db: AsyncSession,
        conversation_id: str,
        messages: List[dict],
        max_tokens: int,
        model: str
    ) -> List[dict]:
        """Summarize older messages and keep recent ones."""
        
        # Check if we have existing summaries
        result = await db.execute(
            select(ConversationSummary)
            .where(ConversationSummary.conversation_id == conversation_id)
            .order_by(desc(ConversationSummary.created_at))
            .limit(1)
        )
        existing_summary = result.scalars().first()
        
        # Calculate how many messages to keep unsummarized
        target_tokens = int(max_tokens * SUMMARY_COMPRESSION_RATIO)
        
        # Work backwards from the end to find how many recent messages fit
        recent_tokens = 0
        keep_count = 0
        
        for i in range(len(messages) - 1, -1, -1):
            msg_tokens = ollama_service.count_tokens(messages[i]['content'])
            if recent_tokens + msg_tokens > target_tokens:
                break
            recent_tokens += msg_tokens
            keep_count += 1
        
        # Ensure we keep at least the last 2 messages (1 user + 1 assistant)
        keep_count = max(keep_count, 2)
        
        messages_to_summarize = messages[:-keep_count] if keep_count > 0 else messages
        recent_messages = messages[-keep_count:] if keep_count > 0 else []
        
        # If we already summarized these messages, use existing summary
        if existing_summary and existing_summary.messages_summarized >= len(messages_to_summarize):
            summary_text = existing_summary.summary_text
        else:
            # Create new summary
            summary_text = await self._create_summary(messages_to_summarize, model)
            
            # Store summary
            new_summary = ConversationSummary(
                conversation_id=conversation_id,
                summary_text=summary_text,
                messages_summarized=len(messages_to_summarize)
            )
            db.add(new_summary)
            await db.commit()
        
        # Combine summary with recent messages
        result_messages = [
            {"role": "system", "content": f"Previous conversation summary:\n{summary_text}"}
        ]
        result_messages.extend(recent_messages)
        
        return result_messages
    
    async def _create_summary(self, messages: List[dict], model: str) -> str:
        """Create a summary of the conversation."""
        if not messages:
            return "No previous conversation."
        
        # Create prompt for summarization
        conversation_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in messages
        ])
        
        summarization_prompt = [
            {
                "role": "system",
                "content": "You are a helpful assistant that creates concise summaries of conversations. "
                          "Capture the key points, decisions, and context that would be important for continuing the conversation."
            },
            {
                "role": "user",
                "content": f"Please summarize the following conversation concisely:\n\n{conversation_text}"
            }
        ]
        
        summary = await ollama_service.chat(model, summarization_prompt, temperature=0.3)
        return summary
    
    async def should_summarize(
        self,
        db: AsyncSession,
        conversation_id: str,
        model: str
    ) -> bool:
        """Check if conversation should be summarized."""
        context_window = MODEL_CONFIGS.get(model, {}).get('context_window', settings.default_context_window)
        max_tokens = int(context_window * SUMMARY_TRIGGER_PERCENTAGE)
        
        # Get all messages
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.timestamp)
        )
        messages = result.scalars().all()
        
        message_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        total_tokens = ollama_service.count_messages_tokens(message_dicts)
        return total_tokens > max_tokens


# Singleton instance
context_manager = ContextManager()
