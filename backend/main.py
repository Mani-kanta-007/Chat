from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from config import settings
from routes import chat, conversations, documents, models


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown."""
    # Startup
    print("Initializing database...")
    await init_db()
    print("Database initialized successfully!")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="ChatGPT Clone API",
    description="A modern ChatGPT-like API with local Ollama models",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(models.router, prefix="/api/models", tags=["Models"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "ChatGPT Clone API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
