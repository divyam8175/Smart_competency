from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, Query
import logging
from typing import Any

from ..db import get_database
from ..schemas import CandidateCreate, CandidateResponse, TokenData, ApplicationStatus, UserRole
from ..services.competency import extract_skills
from ..services.ollama_client import OllamaClient
from ..services.auth import get_current_user, get_current_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/candidates", tags=["candidates"])
OLLAMA_AVAILABLE = True
try:
    ollama_client = OllamaClient()
except Exception:
    OLLAMA_AVAILABLE = False
    ollama_client = None


def _serialize(doc) -> CandidateResponse:
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    doc["_id"] = str(doc["_id"])
    if "ollama_summary" not in doc and doc.get("grok_summary"):
        doc["ollama_summary"] = doc.get("grok_summary")
    doc.pop("grok_summary", None)
    return CandidateResponse(**doc)


@router.post("", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    payload: CandidateCreate,
    current_user: TokenData = Depends(get_current_user)
) -> CandidateResponse:
    logger.info(f"Creating candidate: {payload.full_name} ({payload.email}) by user: {current_user.email}")
    
    db = get_database()
    extracted_skills = extract_skills(payload.resume_text, payload.portfolio_links)
    logger.info(f"Extracted {len(extracted_skills)} skills")

    ollama_summary = None
    if OLLAMA_AVAILABLE and ollama_client:
        try:
            logger.info("Requesting Ollama summary...")
            ollama_summary = await ollama_client.generate_summary(
                {
                    "candidate": payload.model_dump(),
                    "skills": [skill.model_dump() for skill in extracted_skills],
                }
            )
            logger.info("Ollama summary generated successfully")
        except Exception as exc:  # pragma: no cover - external dependency
            logger.warning(f"Ollama generation failed: {exc}")
            ollama_summary = f"Ollama unavailable: {exc}"

    now = datetime.utcnow()
    document = {
        **payload.model_dump(),
        "extracted_skills": [skill.model_dump() for skill in extracted_skills],
        "ollama_summary": ollama_summary,
        "created_at": now,
        "updated_at": now,
    }

    result = await db["candidates"].insert_one(document)
    logger.info(f"Candidate saved with ID: {result.inserted_id}")
    
    created = await db["candidates"].find_one({"_id": result.inserted_id})
    logger.info("Candidate created successfully, returning response")
    return _serialize(created)


@router.get("", response_model=list[CandidateResponse])
async def list_candidates(current_user: TokenData = Depends(get_current_admin)) -> list[CandidateResponse]:
    db = get_database()
    cursor = db["candidates"].find().sort("created_at", -1)
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(CandidateResponse(**doc))
    return results


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: str,
    current_user: TokenData = Depends(get_current_admin)
) -> CandidateResponse:
    db = get_database()
    try:
        object_id = ObjectId(candidate_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    doc = await db["candidates"].find_one({"_id": object_id})
    return _serialize(doc)


# ── Candidate Job Browsing & Application Endpoints ──────────────────────────

@router.get("/jobs/browse")
async def browse_open_jobs(
    search: str | None = Query(None),
    skill: str | None = Query(None),
    location: str | None = Query(None),
    current_user: TokenData = Depends(get_current_user),
):
    """Browse all open job postings (candidate-facing)."""
    db = get_database()
    filters: list[dict[str, Any]] = [{"status": "OPEN"}]

    if search:
        regex = {"$regex": search, "$options": "i"}
        filters.append({"$or": [{"title": regex}, {"description": regex}]})
    if skill:
        filters.append({"required_skills": {"$elemMatch": {"$regex": skill, "$options": "i"}}})
    if location:
        filters.append({"location": {"$regex": location, "$options": "i"}})

    query = {"$and": filters}
    cursor = db["job_openings"].find(query).sort("created_at", -1).limit(100)
    jobs: list[dict[str, Any]] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Don't expose recruiter email to candidates
        doc.pop("recruiter_email", None)
        jobs.append(doc)
    return jobs


@router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """Apply to a job posting as a candidate."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only candidates can apply")

    db = get_database()
    try:
        object_id = ObjectId(job_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    job = await db["job_openings"].find_one({"_id": object_id, "status": "OPEN"})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found or not open")

    # Check if already applied
    existing = await db["job_applications"].find_one({
        "job_id": job_id,
        "candidate_email": current_user.email,
    })
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already applied to this job")

    # Get candidate name from profile
    profile = await db["candidate_profiles"].find_one({"email": current_user.email})
    candidate_name = profile.get("full_name") if profile else None

    now = datetime.utcnow()
    document = {
        "job_id": job_id,
        "job_title": job.get("title"),
        "candidate_email": current_user.email,
        "candidate_name": candidate_name,
        "status": ApplicationStatus.APPLIED.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await db["job_applications"].insert_one(document)
    created = await db["job_applications"].find_one({"_id": result.inserted_id})
    created["_id"] = str(created["_id"])
    return created


@router.get("/jobs/my-applications")
async def my_applications(
    current_user: TokenData = Depends(get_current_user),
):
    """List all jobs the current candidate has applied to."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only candidates can view applications")

    db = get_database()
    cursor = db["job_applications"].find({"candidate_email": current_user.email}).sort("created_at", -1)
    apps: list[dict[str, Any]] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        apps.append(doc)
    return apps


@router.delete("/jobs/{job_id}/withdraw")
async def withdraw_application(
    job_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    """Withdraw a job application."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only candidates can withdraw")

    db = get_database()
    result = await db["job_applications"].update_one(
        {"job_id": job_id, "candidate_email": current_user.email, "status": ApplicationStatus.APPLIED.value},
        {"$set": {"status": ApplicationStatus.WITHDRAWN.value, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found or already processed")
    return {"withdrawn": True}
