# MyChatGPT - Local LLM Chat Application

A modern, full-stack ChatGPT-like application powered by local Ollama models with advanced features including RAG (Retrieval Augmented Generation), web search, and intelligent context management.



## ✨ Features

- 🤖 **Multiple Local LLM Models**: Switch between Llama 3.2, Phi-3, Gemma 3, and Llama 2
- 📄 **RAG Support**: Upload and query documents (PDF, DOCX, TXT)
- 🌐 **Web Search**: Get current information from the internet using Tavily API
- 💾 **Persistent Chat History**: All conversations saved in PostgreSQL
- 🧠 **Smart Context Management**: Automatic summarization when approaching token limits
- 🎨 **Modern UI**: Glassmorphism design with smooth animations
- ⚡ **Real-time Streaming**: See responses as they're generated
- 🔄 **Model Switching**: Change models mid-conversation

## 🏗️ Architecture

```
Chat/
├── backend/           # FastAPI Python backend
│   ├── services/      # Core business logic
│   ├── routes/        # API endpoints
│   ├── models.py      # Database models
│   └── main.py        # Application entry
└── frontend/          # React frontend
    ├── src/
    │   ├── components/  # UI components
    │   └── services/    # API client
    └── package.json
```

## 📋 Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** (running in Docker or locally)
- **Ollama** with models installed:
  - llama3.2:latest
  - phi3:latest
  - gemma3:1b
  - nomic-embed-text:v1.5 (for embeddings)
  - llama2:latest

## 🚀 Setup Instructions

### 1. Database Setup

Make sure PostgreSQL is running with the connection details:
```
Host: localhost
Port: 5432
Database: postgres
User: postgres
Password: mysecretpassword
```

The application will automatically create the required tables and enable the `pgvector` extension.

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Mac/Linux
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env and add your Tavily API key
# TAVILY_API_KEY=your_key_here
# Get a free key at: https://tavily.com

# Run the backend
python main.py
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Verify Ollama Models

```bash
# Check installed models
ollama list

# Pull missing models if needed
ollama pull llama3.2:latest
ollama pull phi3:latest
ollama pull gemma3:1b
ollama pull nomic-embed-text:v1.5
ollama pull llama2:latest
```

## 🎯 Usage

1. **Start a New Chat**: Click the "New Chat" button in the sidebar
2. **Select a Model**: Choose your preferred model from the dropdown
   - **Llama 3.2**: Best for general use
   - **Phi-3**: Best for reasoning
   - **Gemma 3**: Best for coding
3. **Upload Documents** (Optional): Click the upload button to add PDFs, DOCX, or TXT files for RAG
4. **Enable Web Search** (Optional): Toggle the globe icon to search the web
5. **Send Messages**: Type your message and press Enter

## 🔧 Configuration

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/postgres?sslmode=disable
OLLAMA_BASE_URL=http://localhost:11434
TAVILY_API_KEY=your_api_key_here
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
DEFAULT_CONTEXT_WINDOW=4096
MAX_CONTEXT_TOKENS=3072
```

### Model Configuration

Edit `backend/config.py` to customize model settings:
- Context window sizes
- Model capabilities
- Recommendations and badges

## 📡 API Endpoints

### Conversations
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/{id}` - Get conversation with messages
- `PATCH /api/conversations/{id}` - Update conversation title
- `DELETE /api/conversations/{id}` - Delete conversation

### Chat
- `POST /api/chat/stream` - Stream chat responses (SSE)
- `POST /api/chat/message` - Non-streaming chat

### Documents (RAG)
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/{conversation_id}` - List documents
- `DELETE /api/documents/{id}` - Delete document

### Models
- `GET /api/models` - List available Ollama models
- `GET /api/models/{name}/check` - Check model availability

## 🎨 UI Features

- **Glassmorphism Design**: Modern frosted glass aesthetic
- **Smooth Animations**: Fade-ins, transitions, and micro-interactions
- **Dark Theme**: Easy on the eyes with vibrant accents
- **Responsive Layout**: Works on desktop and tablet
- **Code Highlighting**: Syntax highlighting for code blocks
- **Markdown Support**: Full markdown rendering in messages

## 🧪 Advanced Features

### Context Window Management

The application automatically manages context windows:
- Counts tokens for each message
- Summarizes older messages when approaching limits
- Caches summaries in the database
- Keeps recent messages intact

### RAG (Retrieval Augmented Generation)

1. Upload documents in supported formats
2. Documents are chunked and embedded using `nomic-embed-text`
3. Embeddings stored in PostgreSQL with pgvector
4. Semantic search retrieves relevant chunks
5. Context injected into chat prompts

### Web Search

- Powered by Tavily API
- Real-time information retrieval
- Results formatted and injected into context
- Toggle on/off per message

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `psql -h localhost -U postgres`
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check Python dependencies: `pip install -r requirements.txt`

### Frontend won't connect
- Ensure backend is running on port 8000
- Check CORS settings in `backend/config.py`
- Verify API_BASE_URL in `frontend/src/services/api.js`

### Models not appearing
- Run `ollama list` to check installed models
- Restart Ollama service
- Check `backend/config.py` for model configurations

### RAG not working
- Verify pgvector extension: `psql` then `\dx`
- Check document upload limits
- Ensure `nomic-embed-text:v1.5` is installed



## 🙏 Credits

Built with:
- [React](https://react.dev/) - UI framework
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Ollama](https://ollama.ai/) - Local LLM runtime
- [PostgreSQL](https://www.postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector) - Database
- [Tavily](https://tavily.com/) - Web search API
- [LangChain](https://langchain.com/) - LLM orchestration

---


