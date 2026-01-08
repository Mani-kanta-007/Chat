from fastapi import APIRouter
from services.ollama_service import ollama_service

router = APIRouter()


@router.get("/")
async def get_models():
    """Get list of available Ollama models with metadata."""
    models = await ollama_service.get_available_models()
    return {"models": models}


@router.get("/{model_name}/check")
async def check_model(model_name: str):
    """Check if a specific model is available."""
    available = await ollama_service.check_model_availability(model_name)
    return {"model": model_name, "available": available}
