"""Enhanced AI-powered features for Smart Competency Builder.

This module provides advanced AI capabilities including:
- Interview question generation
- Skill gap analysis
- Mock interview simulation
- Career roadmap planning
- Competency assessment
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
import logging
from typing import Any

from ..services.ollama_client import OllamaClient
from ..services.auth import get_current_user
from ..schemas import TokenData

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai-features"])

# Initialize Ollama client
try:
    ollama_client = OllamaClient()
    OLLAMA_AVAILABLE = True
except Exception as e:
    logger.error(f"Failed to initialize Ollama client: {e}")
    OLLAMA_AVAILABLE = False
    ollama_client = None


# Request/Response Models
class InterviewQuestionsRequest(BaseModel):
    job_role: str = Field(..., description="Target job role")
    experience_level: str = Field(..., description="junior/mid/senior/expert")
    skills: list[str] = Field(..., description="List of skills to assess")
    question_types: list[str] | None = Field(
        default=None,
        description="Types: technical, behavioral, situational, coding",
    )
    num_questions: int = Field(default=10, ge=5, le=30)


class SkillGapAnalysisRequest(BaseModel):
    current_skills: list[str] = Field(..., description="Candidate's current skills")
    target_role_skills: list[str] = Field(..., description="Required skills for target role")
    experience_years: int = Field(..., ge=0, description="Years of experience")


class MockInterviewRequest(BaseModel):
    job_role: str = Field(..., description="Job role context")
    question: str = Field(..., description="The interview question")
    candidate_answer: str = Field(..., description="Candidate's response")
    evaluation_criteria: list[str] | None = Field(
        default=None,
        description="Specific criteria to evaluate",
    )


class CareerRoadmapRequest(BaseModel):
    current_role: str = Field(..., description="Current job role")
    target_role: str = Field(..., description="Desired future role")
    experience_years: int = Field(..., ge=0, description="Years of experience")
    current_skills: list[str] = Field(..., description="Current skill set")
    industry: str = Field(default="Technology", description="Industry context")


class CompetencyAssessmentRequest(BaseModel):
    competency_name: str = Field(..., description="Competency to assess")
    evidence: str = Field(..., description="Evidence text (resume, answer, project)")
    role_level: str = Field(..., description="junior/mid/senior/expert")


# API Endpoints
@router.post("/generate-interview-questions", status_code=status.HTTP_200_OK)
async def generate_interview_questions(
    request: InterviewQuestionsRequest,
    current_user: TokenData = Depends(get_current_user),
) -> dict[str, Any]:
    """Generate role-specific interview questions using AI.
    
    Returns categorized questions (technical, behavioral, situational, coding)
    with difficulty levels and evaluation criteria.
    """
    if not OLLAMA_AVAILABLE or not ollama_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    try:
        logger.info(
            f"Generating interview questions for {request.job_role} by user: {current_user.email}"
        )
        questions = await ollama_client.generate_interview_questions(
            job_role=request.job_role,
            experience_level=request.experience_level,
            skills=request.skills,
            question_types=request.question_types,
            num_questions=request.num_questions,
        )
        return {
            "success": True,
            "data": questions,
            "meta": {
                "job_role": request.job_role,
                "experience_level": request.experience_level,
                "total_questions": request.num_questions,
            },
        }
    except Exception as e:
        logger.error(f"Failed to generate interview questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}",
        )


@router.post("/analyze-skill-gaps", status_code=status.HTTP_200_OK)
async def analyze_skill_gaps(
    request: SkillGapAnalysisRequest,
    current_user: TokenData = Depends(get_current_user),
) -> dict[str, Any]:
    """Analyze skill gaps and provide personalized learning recommendations.
    
    Returns detailed analysis including:
    - Missing critical skills
    - Skills to strengthen
    - Learning roadmap with phases
    - Recommended resources and projects
    - Priority order and timelines
    """
    if not OLLAMA_AVAILABLE or not ollama_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    try:
        logger.info(f"Analyzing skill gaps for user: {current_user.email}")
        analysis = await ollama_client.analyze_skill_gaps(
            current_skills=request.current_skills,
            target_role_skills=request.target_role_skills,
            experience_years=request.experience_years,
        )
        return {
            "success": True,
            "data": analysis,
            "meta": {
                "current_skills_count": len(request.current_skills),
                "target_skills_count": len(request.target_role_skills),
                "experience_years": request.experience_years,
            },
        }
    except Exception as e:
        logger.error(f"Failed to analyze skill gaps: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze skill gaps: {str(e)}",
        )


@router.post("/mock-interview", status_code=status.HTTP_200_OK)
async def simulate_mock_interview(
    request: MockInterviewRequest,
    current_user: TokenData = Depends(get_current_user),
) -> dict[str, Any]:
    """Simulate a mock interview and evaluate the candidate's answer.
    
    Returns comprehensive feedback including:
    - Overall score and dimension scores
    - Strengths and improvements
    - Missing points and better answer suggestions
    - Follow-up questions
    - Hiring recommendation
    """
    if not OLLAMA_AVAILABLE or not ollama_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    try:
        logger.info(f"Running mock interview for user: {current_user.email}")
        evaluation = await ollama_client.simulate_mock_interview(
            job_role=request.job_role,
            question=request.question,
            candidate_answer=request.candidate_answer,
            evaluation_criteria=request.evaluation_criteria,
        )
        return {
            "success": True,
            "data": evaluation,
            "meta": {
                "job_role": request.job_role,
                "answer_length": len(request.candidate_answer),
            },
        }
    except Exception as e:
        logger.error(f"Failed to simulate mock interview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate interview: {str(e)}",
        )


@router.post("/career-roadmap", status_code=status.HTTP_200_OK)
async def generate_career_roadmap(
    request: CareerRoadmapRequest,
    current_user: TokenData = Depends(get_current_user),
) -> dict[str, Any]:
    """Generate a multi-year career progression roadmap.
    
    Returns strategic career plan including:
    - Step-by-step career path
    - Milestone checklist
    - Year-by-year skill development plan
    - Alternative paths
    - Networking strategy
    - Risk mitigation
    """
    if not OLLAMA_AVAILABLE or not ollama_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    try:
        logger.info(
            f"Generating career roadmap from {request.current_role} to {request.target_role} for user: {current_user.email}"
        )
        roadmap = await ollama_client.generate_career_roadmap(
            current_role=request.current_role,
            target_role=request.target_role,
            experience_years=request.experience_years,
            current_skills=request.current_skills,
            industry=request.industry,
        )
        return {
            "success": True,
            "data": roadmap,
            "meta": {
                "current_role": request.current_role,
                "target_role": request.target_role,
                "industry": request.industry,
            },
        }
    except Exception as e:
        logger.error(f"Failed to generate career roadmap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate roadmap: {str(e)}",
        )


@router.post("/assess-competency", status_code=status.HTTP_200_OK)
async def assess_competency(
    request: CompetencyAssessmentRequest,
    current_user: TokenData = Depends(get_current_user),
) -> dict[str, Any]:
    """Assess a specific competency based on evidence provided.
    
    Returns detailed assessment including:
    - Overall rating and proficiency level
    - Demonstrated behaviors
    - Missing indicators
    - Development recommendations
    - Benchmark comparison
    - Strengths and growth areas
    """
    if not OLLAMA_AVAILABLE or not ollama_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    try:
        logger.info(
            f"Assessing {request.competency_name} competency for user: {current_user.email}"
        )
        assessment = await ollama_client.assess_competency(
            competency_name=request.competency_name,
            evidence=request.evidence,
            role_level=request.role_level,
        )
        return {
            "success": True,
            "data": assessment,
            "meta": {
                "competency": request.competency_name,
                "role_level": request.role_level,
            },
        }
    except Exception as e:
        logger.error(f"Failed to assess competency: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assess competency: {str(e)}",
        )


@router.get("/health", status_code=status.HTTP_200_OK)
async def check_ai_service_health() -> dict[str, Any]:
    """Check the health status of AI services."""
    return {
        "ollama_available": OLLAMA_AVAILABLE,
        "status": "healthy" if OLLAMA_AVAILABLE else "unavailable",
        "features": [
            "interview_questions",
            "skill_gap_analysis",
            "mock_interview",
            "career_roadmap",
            "competency_assessment",
        ] if OLLAMA_AVAILABLE else [],
    }
