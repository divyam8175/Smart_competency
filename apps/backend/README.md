# Backend (FastAPI)

The FastAPI application orchestrates candidate ingestion, competency extraction, Ollama-assisted insight generation, and persistence to MongoDB. It is structured for async I/O and future Celery workers.

## Setup

```powershell
cd apps/backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cp ..\..\.env.example .env  # or create a backend-specific env file
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

- `MONGODB_URI` (required)
- `MONGODB_DB_NAME` (default: `smart_competency_builder`)
- `OLLAMA_HOST` (default: `http://ollama:11434` in Docker)
- `OLLAMA_SUMMARY_MODEL`
- `OLLAMA_ANALYSIS_MODEL` (optional override)
- `MINIO_ENDPOINT`, `REDIS_URL`, `QDRANT_URL` (placeholders for future modules)

## Local Ollama runtime

Running FastAPI outside Docker requires a local Ollama daemon:

1. Install [Ollama](https://ollama.com/download) and run `ollama serve`.
2. Pull the models you reference in `.env`, e.g. `ollama pull llama3.2`.
3. Set `OLLAMA_HOST=http://localhost:11434` so the backend connects to your local daemon.

## Project Structure

```
app/
├── main.py               # FastAPI entrypoint
├── config.py             # Pydantic settings
├── db.py                 # Mongo client helpers
├── schemas.py            # Pydantic models
├── routers/
│   └── candidates.py     # REST endpoints for candidates
└── services/
    ├── ollama_client.py  # Local Ollama integration
    └── competency.py     # Skill extraction + roadmap stubs
```

## Tests

Add unit tests under `tests/` (not yet created). Pytest is included in requirements.
