from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_database
from app.schemas import (
    CandidateAdminCreate,
    CandidateProfileUpdate,
    RecruiterCreate,
    RecruiterProfileUpdate,
    UserRole,
    UserStatusUpdate,
)
from app.services.auth import get_current_admin, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _sanitize_user(doc: dict[str, Any]) -> dict[str, Any]:
    safe_doc = {k: v for k, v in doc.items() if k != "hashed_password"}
    safe_doc["_id"] = str(doc["_id"])
    return safe_doc


def _serialize_candidate(profile: dict[str, Any], user_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    serialized = {**profile, "_id": str(profile["_id"]) }
    user = user_map.get(profile.get("email"))
    if user:
        serialized["user"] = user
    return serialized


@router.get("/candidates")
async def list_candidate_profiles(current_admin=Depends(get_current_admin)):
    """Return candidate profiles with linked account metadata for admin oversight."""
    db = get_database()
    profiles = (
        await db["candidate_profiles"].find().sort("updated_at", -1).to_list(length=200)
    )

    emails = {p.get("email") for p in profiles if p.get("email")}
    user_cursor = db["users"].find({"email": {"$in": list(emails)}})
    user_map: dict[str, dict[str, Any]] = {}
    async for doc in user_cursor:
        user_map[doc["email"]] = _sanitize_user(doc)

    return [_serialize_candidate(profile, user_map) for profile in profiles]


@router.put("/candidates/{candidate_id}")
async def update_candidate_profile(
    candidate_id: str,
    payload: CandidateProfileUpdate,
    current_admin=Depends(get_current_admin),
):
    """Allow admins to adjust candidate profile metadata."""
    try:
        object_id = ObjectId(candidate_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    update_payload = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update fields supplied")

    db = get_database()
    update_payload["updated_at"] = datetime.utcnow()
    result = await db["candidate_profiles"].update_one({"_id": object_id}, {"$set": update_payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")

    updated = await db["candidate_profiles"].find_one({"_id": object_id})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")

    user = None
    if updated.get("email"):
        linked_user = await db["users"].find_one({"email": updated["email"]})
        if linked_user:
            user = _sanitize_user(linked_user)

    updated["_id"] = str(updated["_id"])
    if user:
        updated["user"] = user
    return updated


@router.post("/candidates")
async def create_candidate_profile(
    payload: CandidateAdminCreate,
    current_admin=Depends(get_current_admin),
):
    """Create a candidate profile record (does not create login credentials)."""
    db = get_database()
    now = datetime.utcnow()
    document = {
        **payload.model_dump(exclude_none=True),
        "skills": payload.skills or [],
        "portfolio_links": payload.portfolio_links or [],
        "created_at": now,
        "updated_at": now,
    }
    result = await db["candidate_profiles"].insert_one(document)
    created = await db["candidate_profiles"].find_one({"_id": result.inserted_id})
    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create candidate")
    created["_id"] = str(created["_id"])
    return created


@router.delete("/candidates/{candidate_id}")
async def delete_candidate_profile(candidate_id: str, current_admin=Depends(get_current_admin)):
    """Remove a candidate profile."""
    try:
        object_id = ObjectId(candidate_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    result = await db["candidate_profiles"].delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return {"deleted": True}


@router.get("/recruiters")
async def list_recruiters(current_admin=Depends(get_current_admin)):
    """Return recruiter accounts while omitting credential details."""
    db = get_database()
    cursor = db["users"].find({"role": UserRole.RECRUITER.value}, {"hashed_password": 0}).sort("created_at", -1)
    results: list[dict[str, Any]] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


@router.put("/recruiters/{user_id}")
async def update_recruiter_profile(
    user_id: str,
    payload: RecruiterProfileUpdate,
    current_admin=Depends(get_current_admin),
):
    """Update recruiter metadata stored on the user document."""
    try:
        object_id = ObjectId(user_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    update_payload = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update fields supplied")

    db = get_database()
    update_payload["updated_at"] = datetime.utcnow()
    result = await db["users"].update_one(
        {"_id": object_id, "role": UserRole.RECRUITER.value},
        {"$set": update_payload},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")

    updated = await db["users"].find_one({"_id": object_id}, {"hashed_password": 0})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")

    updated["_id"] = str(updated["_id"])
    return updated


@router.post("/recruiters")
async def create_recruiter(
    payload: RecruiterCreate,
    current_admin=Depends(get_current_admin),
):
    """Provision a recruiter account with a temporary password."""
    db = get_database()
    existing = await db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    now = datetime.utcnow()
    doc = {
        "email": payload.email,
        "full_name": payload.full_name,
        "hashed_password": get_password_hash(payload.password),
        "role": UserRole.RECRUITER.value,
        "company": payload.company,
        "phone": payload.phone,
        "notes": payload.notes,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    result = await db["users"].insert_one(doc)
    created = await db["users"].find_one({"_id": result.inserted_id}, {"hashed_password": 0})
    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create recruiter")
    created["_id"] = str(created["_id"])
    return created


@router.delete("/recruiters/{user_id}")
async def delete_recruiter(user_id: str, current_admin=Depends(get_current_admin)):
    """Remove a recruiter account and any associated job postings or invites."""
    try:
        object_id = ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    recruiter = await db["users"].find_one({"_id": object_id, "role": UserRole.RECRUITER.value})
    if not recruiter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")

    await db["users"].delete_one({"_id": object_id})
    email = recruiter["email"]
    await db["job_openings"].delete_many({"recruiter_email": email})
    await db["recruiter_invites"].delete_many({"recruiter_email": email})
    return {"deleted": True}


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    current_admin=Depends(get_current_admin),
):
    """Toggle whether a candidate or recruiter account is active."""
    try:
        object_id = ObjectId(user_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    result = await db["users"].update_one(
        {"_id": object_id},
        {"$set": {"is_active": payload.is_active, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updated = await db["users"].find_one({"_id": object_id}, {"hashed_password": 0})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updated["_id"] = str(updated["_id"])
    return updated
