from __future__ import annotations

from datetime import datetime
from typing import Any
from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    CANDIDATE = "CANDIDATE"
    RECRUITER = "RECRUITER"


class SkillInsight(BaseModel):
    name: str
    category: str
    confidence: float = Field(ge=0, le=1)


class CandidateBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    current_role: str | None = None
    experience_years: int | None = None
    education: str | None = None
    skills: list[str] = []
    resume_text: str | None = None
    portfolio_links: list[str] = []


class CandidateCreate(CandidateBase):
    notes: str | None = None


class CandidateProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    current_role: str | None = None
    experience_years: int | None = None
    education: str | None = None
    skills: list[str] | None = None
    resume_text: str | None = None
    portfolio_links: list[str] | None = None


class RecruiterProfileUpdate(BaseModel):
    full_name: str | None = None
    company: str | None = None
    phone: str | None = None
    notes: str | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class CandidateAdminCreate(CandidateProfileUpdate):
    email: EmailStr


class RecruiterCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    company: str | None = None
    phone: str | None = None
    notes: str | None = None


class JobDescriptionInput(BaseModel):
    title: str
    description: str
    required_skills: list[str] = []
    experience_required: int | None = None
    responsibilities: str | None = None
    qualifications: str | None = None


class CompatibilityAnalysis(BaseModel):
    overall_match: float = Field(ge=0, le=100, description="Overall compatibility percentage")
    skills_match: float = Field(ge=0, le=100, description="Skills match percentage")
    experience_match: float = Field(ge=0, le=100, description="Experience match percentage")
    education_match: float = Field(ge=0, le=100, description="Education match percentage")
    responsibility_match: float = Field(ge=0, le=100, description="Responsibility alignment percentage")
    strengths: list[str] = Field(description="Candidate's strengths for this role")
    gaps: list[str] = Field(description="Areas where candidate may need improvement")
    recommendations: list[str] = Field(description="Recommendations for candidate")
    detailed_analysis: str = Field(description="Detailed AI analysis")
    scorecard: Scorecard | None = None


class AnalysisRequest(BaseModel):
    candidate_id: str
    job_description: JobDescriptionInput


class RoadmapAction(BaseModel):
    title: str
    description: str
    resources: list[str] = Field(default_factory=list)


class RoadmapPhase(BaseModel):
    title: str
    duration: str
    focus: str
    outcomes: list[str] = Field(default_factory=list)
    actions: list[RoadmapAction] = Field(default_factory=list)


class LearningRoadmap(BaseModel):
    headline: str
    goal_summary: str
    phases: list[RoadmapPhase] = Field(default_factory=list)
    quick_wins: list[str] = Field(default_factory=list)
    ongoing_habits: list[str] = Field(default_factory=list)
    suggested_resources: list[str] = Field(default_factory=list)
    success_metrics: list[str] = Field(default_factory=list)


class RoadmapRequest(BaseModel):
    candidate_id: str
    job_description: JobDescriptionInput
    target_role: str | None = None


class JobStatus(str, Enum):
    OPEN = "OPEN"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"


class JobOpeningBase(BaseModel):
    title: str
    description: str
    required_skills: list[str] = Field(default_factory=list)
    location: str | None = None
    employment_type: str | None = None
    status: JobStatus = JobStatus.OPEN


class JobOpeningCreate(JobOpeningBase):
    pass


class JobOpeningUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    required_skills: list[str] | None = None
    location: str | None = None
    employment_type: str | None = None
    status: JobStatus | None = None


class JobOpeningResponse(JobOpeningBase):
    id: str = Field(alias="_id")
    recruiter_email: EmailStr
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class InvitationStatus(str, Enum):
    PENDING = "PENDING"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    CANCELLED = "CANCELLED"


class RecruiterInviteCreate(BaseModel):
    job_id: str
    candidate_email: EmailStr
    message: str | None = None


class RecruiterInviteUpdate(BaseModel):
    status: InvitationStatus


class RecruiterInviteResponse(BaseModel):
    id: str = Field(alias="_id")
    job_id: str
    candidate_email: EmailStr
    candidate_name: str | None = None
    recruiter_email: EmailStr
    message: str | None = None
    status: InvitationStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class InterviewStatus(str, Enum):
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InterviewRecord(BaseModel):
    id: str = Field(alias="_id")
    invite_id: str
    job_id: str
    job_title: str | None = None
    candidate_email: EmailStr
    candidate_name: str | None = None
    recruiter_email: EmailStr
    recruiter_name: str | None = None
    status: InterviewStatus
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    class Config:
        populate_by_name = True


class InterviewUpdate(BaseModel):
    status: InterviewStatus


class CandidateResponse(CandidateBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime
    extracted_skills: list[SkillInsight]
    ollama_summary: str | None = None

    class Config:
        populate_by_name = True


class Scorecard(BaseModel):
    technical_skill_index: float = Field(ge=0, le=100)
    cognitive_ability_index: float = Field(ge=0, le=100)
    behavioral_fit_score: float = Field(ge=0, le=100)
    learning_agility_score: float = Field(ge=0, le=100)
    growth_potential_score: float = Field(ge=0, le=100)
    job_role_match: float = Field(ge=0, le=100)
    best_fit_roles: list[str] = Field(default_factory=list)
    strength_summary: str = ""
    weakness_summary: str = ""


class CandidateScorecard(BaseModel):
    candidate_id: str
    metrics: Scorecard
    reasoning: dict[str, Any]


# Authentication schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.CANDIDATE


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str = Field(alias="_id")
    role: UserRole
    created_at: datetime
    is_active: bool = True

    class Config:
        populate_by_name = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    email: str | None = None
    role: UserRole | None = None


# Job Application schemas
class ApplicationStatus(str, Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class JobApplicationCreate(BaseModel):
    job_id: str


class JobApplicationResponse(BaseModel):
    id: str = Field(alias="_id")
    job_id: str
    job_title: str | None = None
    candidate_email: EmailStr
    candidate_name: str | None = None
    status: ApplicationStatus
    created_at: datetime

    class Config:
        populate_by_name = True


# AI Top Candidates ranking
class TopCandidatesRequest(BaseModel):
    job_id: str
