from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, status
from datetime import datetime
from typing import Any
from app.schemas import (
    CandidateProfileUpdate,
    JobDescriptionInput,
    CompatibilityAnalysis,
    AnalysisRequest,
    InvitationStatus,
    InterviewStatus,
    LearningRoadmap,
    RecruiterInviteUpdate,
    RoadmapRequest,
)
from app.services.auth import get_current_user, TokenData
from app.services.resume_parser import extract_text_from_pdf, parse_resume_text, parse_job_description
from app.services.compatibility_analyzer import compatibility_analyzer
from app.db import get_database
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/me")
async def get_my_profile(current_user: TokenData = Depends(get_current_user)):
    """Get current user's candidate profile."""
    db = get_database()
    
    # Find candidate profile by user email
    profile = await db.candidate_profiles.find_one({"email": current_user.email})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete your profile first."
        )
    
    profile["_id"] = str(profile["_id"])
    return profile


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user)
):
    """Upload and parse resume PDF."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Extract text from PDF
        resume_text = await extract_text_from_pdf(content)
        
        # Parse resume to extract structured data
        parsed_data = parse_resume_text(resume_text)
        
        # Update or create candidate profile
        db = get_database()
        update_data = {
            "email": current_user.email,
            "resume_text": resume_text,
            "skills": parsed_data.get("skills", []),
            "education": parsed_data.get("education", ""),
            "experience_years": parsed_data.get("experience_years", 0),
            "updated_at": datetime.utcnow(),
        }
        
        result = await db.candidate_profiles.update_one(
            {"email": current_user.email},
            {"$set": update_data},
            upsert=True
        )
        
        return {
            "message": "Resume uploaded and parsed successfully",
            "extracted_data": parsed_data,
            "resume_length": len(resume_text)
        }
        
    except Exception as e:
        logger.error(f"Resume upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process resume: {str(e)}"
        )


@router.post("/upload-job-description")
async def upload_job_description(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user)
):
    """Upload and parse job description PDF."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )

    try:
        content = await file.read()
        jd_text = await extract_text_from_pdf(content)
        parsed_data = parse_job_description(jd_text)

        return {
            "message": "Job description parsed successfully",
            "parsed_data": parsed_data,
        }
    except Exception as e:
        logger.error(f"Job description upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process job description: {str(e)}"
        )


@router.put("/update")
async def update_profile(
    profile: CandidateProfileUpdate,
    current_user: TokenData = Depends(get_current_user)
):
    """Update candidate profile with manual entry."""
    db = get_database()
    
    # Only update fields that are provided
    update_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    update_data["email"] = current_user.email
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.candidate_profiles.update_one(
        {"email": current_user.email},
        {"$set": update_data},
        upsert=True
    )
    
    return {
        "message": "Profile updated successfully",
        "modified": result.modified_count > 0 or result.upserted_id is not None
    }


@router.post("/analyze", response_model=CompatibilityAnalysis)
async def analyze_compatibility(
    request: AnalysisRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """
    Analyze compatibility between candidate profile and job description.
    Returns detailed percentage-based metrics for visualization.
    """
    db = get_database()
    
    # Get candidate profile
    if request.candidate_id == "me":
        # Analyze current user's profile
        profile = await db.candidate_profiles.find_one({"email": current_user.email})
    else:
        # Admin can analyze any candidate
        try:
            profile = await db.candidate_profiles.find_one({"_id": ObjectId(request.candidate_id)})
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid candidate ID"
            )
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )
    
    # Perform AI-powered compatibility analysis
    try:
        analysis = await compatibility_analyzer.analyze_compatibility(
            candidate_profile=profile,
            job_description=request.job_description.model_dump()
        )
        
        # Store analysis result
        analysis_record = {
            "candidate_email": profile["email"],
            "job_title": request.job_description.title,
            "analysis": analysis,
            "created_at": datetime.utcnow()
        }
        
        await db.compatibility_analyses.insert_one(analysis_record)
        
        return CompatibilityAnalysis(**analysis)
        
    except Exception as e:
        logger.error(f"Compatibility analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/roadmap", response_model=LearningRoadmap)
async def create_roadmap(
    request: RoadmapRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """Generate a personalized roadmap for the candidate and role."""
    db = get_database()

    # Reuse candidate lookup logic
    if request.candidate_id == "me":
        profile = await db.candidate_profiles.find_one({"email": current_user.email})
    else:
        try:
            profile = await db.candidate_profiles.find_one({"_id": ObjectId(request.candidate_id)})
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid candidate ID",
            )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found",
        )

    try:
        roadmap = await compatibility_analyzer.generate_learning_roadmap(
            candidate_profile=profile,
            job_description=request.job_description.model_dump(),
            target_role=request.target_role,
        )
        roadmap_record = {
            "candidate_email": profile["email"],
            "job_title": request.job_description.title,
            "target_role": request.target_role or request.job_description.title,
            "job_description": request.job_description.model_dump(),
            "roadmap": roadmap,
            "created_at": datetime.utcnow(),
        }
        await db.learning_roadmaps.insert_one(roadmap_record)
        return LearningRoadmap(**roadmap)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        error_msg = str(e) or f"{type(e).__name__}: {repr(e)}"
        logger.error(f"Roadmap generation failed: {error_msg}\n{tb}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Roadmap generation failed: {error_msg}",
        )


@router.get("/analyses")
async def get_my_analyses(current_user: TokenData = Depends(get_current_user)):
    """Get all compatibility analyses for current user."""
    db = get_database()
    
    analyses = await db.compatibility_analyses.find(
        {"candidate_email": current_user.email}
    ).sort("created_at", -1).to_list(length=50)
    
    for analysis in analyses:
        analysis["_id"] = str(analysis["_id"])
    
    return analyses


@router.get("/roadmaps")
async def get_my_roadmaps(current_user: TokenData = Depends(get_current_user)):
    """Get saved learning roadmaps for current user."""
    db = get_database()

    records = (
        await db.learning_roadmaps.find({"candidate_email": current_user.email})
        .sort("created_at", -1)
        .to_list(length=50)
    )

    for record in records:
        record["_id"] = str(record["_id"])

    return records


@router.get("/notifications")
async def get_my_notifications(current_user: TokenData = Depends(get_current_user)):
    """Return recruiter invites and hiring notifications for the candidate."""
    db = get_database()
    active_statuses = [InvitationStatus.PENDING.value, InvitationStatus.VIEWED.value]
    query = {"candidate_email": current_user.email, "status": {"$in": active_statuses}}
    invites = (
        await db.recruiter_invites.find(query)
        .sort("created_at", -1)
        .to_list(length=100)
    )
    for invite in invites:
        invite["_id"] = str(invite["_id"])
    return invites


@router.patch("/notifications/{invite_id}")
async def update_notification_status(
    invite_id: str,
    payload: RecruiterInviteUpdate,
    current_user: TokenData = Depends(get_current_user),
):
    """Allow candidates to acknowledge or respond to a recruiter invite."""
    try:
        object_id = ObjectId(invite_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    db = get_database()
    filters = {"_id": object_id, "candidate_email": current_user.email}
    now = datetime.utcnow()
    result = await db.recruiter_invites.update_one(
        filters,
        {"$set": {"status": payload.status.value, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    updated = await db.recruiter_invites.find_one({"_id": object_id})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if payload.status == InvitationStatus.ACCEPTED:
        interview_payload = {
            "invite_id": invite_id,
            "job_id": updated.get("job_id"),
            "job_title": updated.get("job_title"),
            "candidate_email": updated.get("candidate_email"),
            "candidate_name": updated.get("candidate_name"),
            "recruiter_email": updated.get("recruiter_email"),
            "recruiter_name": updated.get("recruiter_name"),
            "status": InterviewStatus.ONGOING.value,
            "updated_at": now,
            "completed_at": None,
        }
        await db.interviews.update_one(
            {"invite_id": invite_id},
            {
                "$set": interview_payload,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    elif payload.status in {InvitationStatus.DECLINED, InvitationStatus.CANCELLED}:
        await db.interviews.delete_one({"invite_id": invite_id})

    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/interviews")
async def list_candidate_interviews(
    status_filter: InterviewStatus | None = Query(None, alias="status"),
    current_user: TokenData = Depends(get_current_user),
):
    """Return ongoing or completed interviews for the candidate."""
    db = get_database()
    query = {"candidate_email": current_user.email}
    if status_filter:
        query["status"] = status_filter.value if isinstance(status_filter, InterviewStatus) else status_filter

    cursor = db.interviews.find(query).sort("updated_at", -1)
    interviews: list[dict[str, Any]] = []
    async for record in cursor:
        record["_id"] = str(record["_id"])
        interviews.append(record)
    return interviews
