from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .routers import candidates, auth, profile, admin, recruiter, ai_features

app = FastAPI(title="Smart Competency Builder API")

# Allow frontend origins from env (comma-separated) or defaults for local dev
_origins_env = os.getenv("CORS_ORIGINS", "")
_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] if _origins_env else [
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Smart Competency Builder API", "docs": "/docs"}


@app.get("/test-ollama")
async def test_ollama() -> dict[str, str]:
    """Quick endpoint to verify the Ollama runtime is reachable."""
    from .services.ollama_client import OllamaClient

    try:
        client = OllamaClient()
        result = await client.generate_summary(
            {
                "candidate": {
                    "full_name": "Test User",
                    "email": "test@example.com",
                    "job_role": "Developer",
                },
                "skills": [{"name": "Python", "category": "technical", "confidence": 0.9}],
            }
        )
        return {"status": "success", "message": result}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(candidates.router)
app.include_router(admin.router)
app.include_router(recruiter.router)
app.include_router(ai_features.router)
