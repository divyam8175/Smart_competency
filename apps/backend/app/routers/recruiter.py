from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import get_database
from app.schemas import (
    ApplicationStatus,
    InvitationStatus,
    InterviewStatus,
    InterviewUpdate,
    JobOpeningCreate,
    JobOpeningResponse,
    JobOpeningUpdate,
    JobStatus,
    RecruiterInviteCreate,
    RecruiterInviteResponse,
    RecruiterInviteUpdate,
    TokenData,
    TopCandidatesRequest,
    UserRole,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/recruiter", tags=["recruiter"])


def _require_recruiter(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role not in {UserRole.RECRUITER, UserRole.ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")
    if not current_user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authenticated user missing email")
    return current_user


def _serialize_job(doc: dict[str, Any]) -> dict[str, Any]:
    doc["_id"] = str(doc["_id"])
    return doc


def _serialize_invite(doc: dict[str, Any]) -> dict[str, Any]:
    doc["_id"] = str(doc["_id"])
    return doc


def _serialize_interview(doc: dict[str, Any]) -> dict[str, Any]:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/jobs")
async def list_jobs(
    status_filter: str | None = Query(None, alias="status"),
    current_user: TokenData = Depends(_require_recruiter),
):
    db = get_database()
    query: dict[str, Any] = {}
    if current_user.role != UserRole.ADMIN:
        query["recruiter_email"] = current_user.email
    if status_filter:
        query["status"] = status_filter.upper()

    cursor = db["job_openings"].find(query).sort("created_at", -1)
    jobs = []
    async for job in cursor:
        jobs.append(_serialize_job(job))
    return jobs


@router.post("/jobs", response_model=JobOpeningResponse)
async def create_job(
    payload: JobOpeningCreate,
    current_user: TokenData = Depends(_require_recruiter),
):
    db = get_database()
    now = datetime.utcnow()
    document = {
        **payload.model_dump(),
        "status": payload.status.value,
        "recruiter_email": current_user.email,
        "created_at": now,
        "updated_at": now,
    }
    result = await db["job_openings"].insert_one(document)
    created = await db["job_openings"].find_one({"_id": result.inserted_id})
    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create job opening")
    return JobOpeningResponse(**_serialize_job(created))


@router.put("/jobs/{job_id}")
async def update_job(
    job_id: str,
    payload: JobOpeningUpdate,
    current_user: TokenData = Depends(_require_recruiter),
):
    try:
        object_id = ObjectId(job_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    update_payload = payload.model_dump(exclude_none=True)
    if "status" in update_payload:
        status_value = update_payload["status"]
        if isinstance(status_value, JobStatus):
            status_value = status_value.value
        elif isinstance(status_value, str):
            status_value = status_value.upper()
        update_payload["status"] = status_value

    if not update_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    db = get_database()
    filters: dict[str, Any] = {"_id": object_id}
    if current_user.role != UserRole.ADMIN:
        filters["recruiter_email"] = current_user.email
    update_payload["updated_at"] = datetime.utcnow()
    result = await db["job_openings"].update_one(filters, {"$set": update_payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found")

    updated = await db["job_openings"].find_one({"_id": object_id})
    return _serialize_job(updated)


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: TokenData = Depends(_require_recruiter)):
    try:
        object_id = ObjectId(job_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    filters: dict[str, Any] = {"_id": object_id}
    if current_user.role != UserRole.ADMIN:
        filters["recruiter_email"] = current_user.email
    result = await db["job_openings"].delete_one(filters)
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found")
    await db["recruiter_invites"].delete_many({"job_id": job_id})
    return {"deleted": True}


@router.get("/candidates")
async def list_candidates(
    skill: str | None = Query(None),
    min_experience: int | None = Query(None, ge=0),
    max_experience: int | None = Query(None, ge=0),
    search: str | None = Query(None),
    current_user: TokenData = Depends(_require_recruiter),
):
    db = get_database()
    filters: list[dict[str, Any]] = []

    if skill:
        filters.append({"skills": {"$elemMatch": {"$regex": skill, "$options": "i"}}})
    exp_filter: dict[str, Any] = {}
    if min_experience is not None:
        exp_filter["$gte"] = min_experience
    if max_experience is not None:
        exp_filter["$lte"] = max_experience
    if exp_filter:
        filters.append({"experience_years": exp_filter})
    if search:
        regex = {"$regex": search, "$options": "i"}
        filters.append({"$or": [{"full_name": regex}, {"current_role": regex}]})

    query = {"$and": filters} if filters else {}

    cursor = db["candidate_profiles"].find(query).sort("updated_at", -1).limit(200)
    results: list[dict[str, Any]] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


@router.post("/invites", response_model=RecruiterInviteResponse)
async def send_invite(
    payload: RecruiterInviteCreate,
    current_user: TokenData = Depends(_require_recruiter),
):
    db = get_database()
    try:
        job_object_id = ObjectId(payload.job_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    job_filters: dict[str, Any] = {"_id": job_object_id}
    if current_user.role != UserRole.ADMIN:
        job_filters["recruiter_email"] = current_user.email
    job = await db["job_openings"].find_one(job_filters)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found")

    candidate = await db["candidate_profiles"].find_one({"email": payload.candidate_email})
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    now = datetime.utcnow()
    document = {
        "job_id": payload.job_id,
        "job_title": job.get("title"),
        "candidate_email": payload.candidate_email,
        "candidate_name": candidate.get("full_name"),
        "recruiter_email": job["recruiter_email"],
        "message": payload.message,
        "status": InvitationStatus.PENDING.value,
        "created_at": now,
        "updated_at": now,
    }

    result = await db["recruiter_invites"].insert_one(document)
    created = await db["recruiter_invites"].find_one({"_id": result.inserted_id})
    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create invite")
    return RecruiterInviteResponse(**_serialize_invite(created))


@router.get("/invites")
async def list_sent_invites(current_user: TokenData = Depends(_require_recruiter)):
    db = get_database()
    query: dict[str, Any] = {}
    if current_user.role != UserRole.ADMIN:
        query["recruiter_email"] = current_user.email
    cursor = db["recruiter_invites"].find(query).sort("created_at", -1)
    invites: list[dict[str, Any]] = []
    async for invite in cursor:
        invites.append(_serialize_invite(invite))
    return invites


@router.patch("/invites/{invite_id}")
async def update_invite_status(
    invite_id: str,
    payload: RecruiterInviteUpdate,
    current_user: TokenData = Depends(_require_recruiter),
):
    try:
        object_id = ObjectId(invite_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    filters: dict[str, Any] = {"_id": object_id}
    if current_user.role != UserRole.ADMIN:
        filters["recruiter_email"] = current_user.email
    result = await db["recruiter_invites"].update_one(
        filters,
        {"$set": {"status": payload.status.value, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    updated = await db["recruiter_invites"].find_one({"_id": object_id})
    return _serialize_invite(updated)


@router.get("/interviews")
async def list_interviews(
    status_filter: InterviewStatus | None = Query(None, alias="status"),
    current_user: TokenData = Depends(_require_recruiter),
):
    db = get_database()
    query: dict[str, Any] = {}
    if current_user.role != UserRole.ADMIN:
        query["recruiter_email"] = current_user.email
    if status_filter:
        query["status"] = status_filter.value if isinstance(status_filter, InterviewStatus) else status_filter

    cursor = db["interviews"].find(query).sort("updated_at", -1)
    interviews: list[dict[str, Any]] = []
    async for doc in cursor:
        interviews.append(_serialize_interview(doc))
    return interviews


@router.patch("/interviews/{interview_id}")
async def update_interview_status(
    interview_id: str,
    payload: InterviewUpdate,
    current_user: TokenData = Depends(_require_recruiter),
):
    try:
        object_id = ObjectId(interview_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    filters: dict[str, Any] = {"_id": object_id}
    if current_user.role != UserRole.ADMIN:
        filters["recruiter_email"] = current_user.email

    now = datetime.utcnow()
    update_payload: dict[str, Any] = {
        "status": payload.status.value,
        "updated_at": now,
    }
    if payload.status == InterviewStatus.COMPLETED:
        update_payload["completed_at"] = now
    elif payload.status == InterviewStatus.CANCELLED:
        update_payload["completed_at"] = None

    result = await db["interviews"].update_one(filters, {"$set": update_payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    updated = await db["interviews"].find_one({"_id": object_id})
    return _serialize_interview(updated)


@router.get("/jobs/{job_id}/applicants")
async def list_job_applicants(
    job_id: str,
    current_user: TokenData = Depends(_require_recruiter),
):
    """List all candidates who applied for a specific job."""
    try:
        object_id = ObjectId(job_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    job_filters: dict[str, Any] = {"_id": object_id}
    if current_user.role != UserRole.ADMIN:
        job_filters["recruiter_email"] = current_user.email
    job = await db["job_openings"].find_one(job_filters)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    cursor = db["job_applications"].find({"job_id": job_id}).sort("created_at", -1)
    applications: list[dict[str, Any]] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        applications.append(doc)
    return applications


@router.post("/jobs/{job_id}/top-candidates")
async def rank_top_candidates(
    job_id: str,
    current_user: TokenData = Depends(_require_recruiter),
):
    """Use AI to rank all applicants for a job and return them sorted by fit."""
    try:
        object_id = ObjectId(job_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    job_filters: dict[str, Any] = {"_id": object_id}
    if current_user.role != UserRole.ADMIN:
        job_filters["recruiter_email"] = current_user.email
    job = await db["job_openings"].find_one(job_filters)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Get all applicants for this job
    applicant_cursor = db["job_applications"].find({"job_id": job_id, "status": ApplicationStatus.APPLIED.value})
    applicant_emails: list[str] = []
    async for app_doc in applicant_cursor:
        applicant_emails.append(app_doc["candidate_email"])

    if not applicant_emails:
        return {"ranked_candidates": [], "message": "No applicants for this job yet."}

    # Fetch candidate profiles
    candidate_cursor = db["candidate_profiles"].find({"email": {"$in": applicant_emails}})
    candidates_data: list[dict[str, Any]] = []
    async for cdoc in candidate_cursor:
        candidates_data.append({
            "email": cdoc.get("email"),
            "full_name": cdoc.get("full_name"),
            "current_role": cdoc.get("current_role"),
            "experience_years": cdoc.get("experience_years", 0),
            "education": cdoc.get("education"),
            "skills": cdoc.get("skills", []),
        })

    if not candidates_data:
        return {"ranked_candidates": [], "message": "No candidate profiles found."}

    # Build prompt for AI ranking
    job_info = {
        "title": job.get("title"),
        "description": job.get("description"),
        "required_skills": job.get("required_skills", []),
        "location": job.get("location"),
        "employment_type": job.get("employment_type"),
    }

    from app.services.ollama_client import OllamaClient
    try:
        ollama = OllamaClient()
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service unavailable")

    prompt = f"""You are a hiring expert. Analyze the following job and candidates, then rank them from BEST fit to WORST fit.

JOB DETAILS:
Title: {job_info['title']}
Description: {job_info['description']}
Required Skills: {', '.join(job_info['required_skills'])}
Location: {job_info['location'] or 'Not specified'}
Employment Type: {job_info['employment_type'] or 'Not specified'}

CANDIDATES:
"""
    for i, c in enumerate(candidates_data, 1):
        prompt += f"""
Candidate {i}:
- Name: {c['full_name']}
- Email: {c['email']}
- Current Role: {c['current_role'] or 'Not specified'}
- Experience: {c['experience_years']} years
- Education: {c['education'] or 'Not specified'}
- Skills: {', '.join(c['skills'])}
"""

    prompt += """
Return a JSON array ranking candidates from best to worst fit. Each entry should have:
{{
  "rank": 1,
  "email": "candidate email",
  "name": "candidate name",
  "score": 85,
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1"],
  "summary": "Brief 1-2 sentence explanation of why this rank"
}}

Return ONLY the JSON array, no other text."""

    try:
        messages = [
            {"role": "system", "content": "You are an expert hiring consultant. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ]
        result = await ollama.chat(messages, options={"temperature": 0.3, "num_ctx": 8192})

        import json
        # Try to parse JSON from response
        result_clean = result.strip()
        if result_clean.startswith("```"):
            result_clean = result_clean.split("\n", 1)[1] if "\n" in result_clean else result_clean[3:]
            if result_clean.endswith("```"):
                result_clean = result_clean[:-3]
            result_clean = result_clean.strip()

        ranked = json.loads(result_clean)
        return {"ranked_candidates": ranked, "job_title": job_info["title"]}
    except json.JSONDecodeError:
        # Fallback: return unranked list
        fallback = [
            {"rank": i + 1, "email": c["email"], "name": c["full_name"], "score": 0, "strengths": c["skills"][:3], "gaps": [], "summary": "AI could not rank - showing in order of application."}
            for i, c in enumerate(candidates_data)
        ]
        return {"ranked_candidates": fallback, "job_title": job_info["title"], "ai_note": "AI ranking failed, showing applicants in order."}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI ranking failed: {str(e)}")


@router.patch("/jobs/{job_id}/applicants/{application_id}")
async def update_application_status(
    job_id: str,
    application_id: str,
    status_update: dict[str, str],
    current_user: TokenData = Depends(_require_recruiter),
):
    """Update an application's status (shortlist, reject)."""
    try:
        app_oid = ObjectId(application_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    new_status = status_update.get("status", "").upper()
    valid = {s.value for s in ApplicationStatus}
    if new_status not in valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Valid: {valid}")

    db = get_database()
    result = await db["job_applications"].update_one(
        {"_id": app_oid, "job_id": job_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    updated = await db["job_applications"].find_one({"_id": app_oid})
    updated["_id"] = str(updated["_id"])
    return updated
