from pydantic_settings import BaseSettings
from typing import Dict, List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql://postgres:mysecretpassword@localhost:5432/postgres?sslmode=disable"
    
    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    
    # Tavily API
    tavily_api_key: str = "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"
    
    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Context window
    default_context_window: int = 4096
    max_context_tokens: int = 3072
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Model configurations with capabilities
MODEL_CONFIGS: Dict[str, dict] = {
    "llama3.2:latest": {
        "name": "Llama 3.2",
        "context_window": 8192,
        "capabilities": ["general", "reasoning"],
        "recommendation": "Best for General Use",
        "badge_color": "blue"
    },
    "phi3:latest": {
        "name": "Phi-3",
        "context_window": 4096,
        "capabilities": ["reasoning", "general"],
        "recommendation": "Best for Reasoning",
        "badge_color": "purple"
    },
    "gemma3:1b": {
        "name": "Gemma 3 1B",
        "context_window": 8192,
        "capabilities": ["coding", "general"],
        "recommendation": "Best for Coding",
        "badge_color": "green"
    },
    "llama2:latest": {
        "name": "Llama 2",
        "context_window": 4096,
        "capabilities": ["general"],
        "recommendation": "Legacy Support",
        "badge_color": "gray"
    }
}

# Embedding model
EMBEDDING_MODEL = "nomic-embed-text:v1.5"
EMBEDDING_DIMENSION = 768

# RAG settings
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
TOP_K_DOCUMENTS = 5

# Summarization settings
SUMMARY_TRIGGER_PERCENTAGE = 0.75  # Summarize when 75% of context is used
SUMMARY_COMPRESSION_RATIO = 0.3  # Compress to 30% of original


settings = Settings()
