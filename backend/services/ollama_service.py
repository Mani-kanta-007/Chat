import ollama
from typing import AsyncGenerator, List
from config import settings, MODEL_CONFIGS, EMBEDDING_MODEL
import tiktoken


class OllamaService:
    """Service for interacting with Ollama API."""
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.client = ollama.AsyncClient(host=self.base_url)
    
    async def chat_stream(
        self,
        model: str,
        messages: List[dict],
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Stream chat responses from Ollama."""
        try:
            stream = await self.client.chat(
                model=model,
                messages=messages,
                stream=True,
                options={"temperature": temperature}
            )
            
            async for chunk in stream:
                if 'message' in chunk and 'content' in chunk['message']:
                    yield chunk['message']['content']
        except Exception as e:
            yield f"Error: {str(e)}"
    
    async def chat(
        self,
        model: str,
        messages: List[dict],
        temperature: float = 0.7
    ) -> str:
        """Get a non-streaming chat response."""
        try:
            response = await self.client.chat(
                model=model,
                messages=messages,
                stream=False,
                options={"temperature": temperature}
            )
            return response['message']['content']
        except Exception as e:
            return f"Error: {str(e)}"
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using Ollama."""
        try:
            response = await self.client.embeddings(
                model=EMBEDDING_MODEL,
                prompt=text
            )
            return response['embedding']
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []
    
    async def check_model_availability(self, model: str) -> bool:
        """Check if a model is available."""
        try:
            models = await self.client.list()
            available_models = [m['name'] for m in models.get('models', [])]
            return model in available_models
        except Exception as e:
            print(f"Error checking model availability: {e}")
            return False
    
    async def get_available_models(self) -> List[dict]:
        """Get list of available models with metadata."""
        try:
            models = await self.client.list()
            available_models = []
            
            for model in models.get('models', []):
                model_name = model['name']
                if model_name in MODEL_CONFIGS:
                    available_models.append({
                        "name": model_name,
                        "display_name": MODEL_CONFIGS[model_name]["name"],
                        "capabilities": MODEL_CONFIGS[model_name]["capabilities"],
                        "recommendation": MODEL_CONFIGS[model_name]["recommendation"],
                        "badge_color": MODEL_CONFIGS[model_name]["badge_color"],
                        "context_window": MODEL_CONFIGS[model_name]["context_window"]
                    })
            
            return available_models
        except Exception as e:
            print(f"Error getting available models: {e}")
            return []
    
    def count_tokens(self, text: str, model: str = "gpt-3.5-turbo") -> int:
        """Count tokens in text. Using GPT tokenizer as approximation."""
        try:
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except Exception:
            # Fallback: rough estimation
            return len(text) // 4
    
    def count_messages_tokens(self, messages: List[dict]) -> int:
        """Count total tokens in a list of messages."""
        total = 0
        for message in messages:
            total += self.count_tokens(message.get('content', ''))
            total += 4  # Account for message formatting
        return total


# Singleton instance
ollama_service = OllamaService()
