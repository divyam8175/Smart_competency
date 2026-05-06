"""Async client for interacting with Groq Cloud LLM API.

This client provides advanced AI capabilities for:
- Candidate assessment and summaries
- Interview question generation
- Skill gap analysis and learning recommendations
- Mock interview simulations
- Career progression planning
- Competency-based evaluations
"""

from __future__ import annotations

import json
import logging
from typing import Any, Sequence

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class OllamaClient:
    """Wrapper over the Groq chat-completions API (OpenAI-compatible)."""

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.groq_api_key
        self.model = settings.groq_model
        self.timeout = httpx.Timeout(float(settings.groq_timeout), connect=30.0)

    async def chat(
        self,
        messages: Sequence[dict[str, str]],
        *,
        model: str | None = None,
        options: dict[str, Any] | None = None,
        response_format: str | None = None,
    ) -> str:
        """Send chat messages to Groq and return the text body."""

        if not messages:
            raise ValueError("messages cannot be empty")

        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")

        target_model = model or self.model

        payload: dict[str, Any] = {
            "model": target_model,
            "messages": list(messages),
        }

        # Map options (Ollama-style) to Groq params
        if options:
            if "temperature" in options:
                payload["temperature"] = options["temperature"]
            if "num_ctx" in options:
                payload["max_tokens"] = min(options["num_ctx"], 8192)

        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        logger.debug("Calling Groq with model %s", target_model)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(GROQ_API_URL, json=payload, headers=headers)
                logger.info("Groq response status: %s", response.status_code)
                response.raise_for_status()
        except httpx.ConnectError:
            raise RuntimeError("Cannot connect to Groq API. Check network connectivity.")
        except httpx.ReadTimeout:
            raise RuntimeError(
                f"Groq timed out after {self.timeout.read}s. Try a simpler prompt or shorter input."
            )
        except httpx.HTTPStatusError as e:
            error_body = e.response.text
            logger.error("Groq API error: %s", error_body)
            raise RuntimeError(f"Groq API error ({e.response.status_code}): {error_body}")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("Groq response did not include any choices")
        content = choices[0].get("message", {}).get("content")
        if not content:
            raise RuntimeError("Groq response did not include content")
        return content.strip()

    async def generate_summary(self, payload: dict[str, Any]) -> str:
        """Generate a candidate summary using the configured summary model."""

        prompt = self._build_prompt(payload)
        messages = [
            {
                "role": "system",
                "content": "You create concise, bias-aware hiring summaries.",
            },
            {"role": "user", "content": prompt},
        ]

        return await self.chat(
            messages,
            model=self.model,
            options={"temperature": 0.2, "num_ctx": 4096},
        )

    async def generate_interview_questions(
        self,
        job_role: str,
        experience_level: str,
        skills: list[str],
        question_types: list[str] | None = None,
        num_questions: int = 10,
    ) -> dict[str, Any]:
        """Generate role-specific interview questions.
        
        Args:
            job_role: Target job role
            experience_level: junior/mid/senior/expert
            skills: List of skills to focus on
            question_types: Types to include (technical, behavioral, situational, coding)
            num_questions: Total questions to generate
            
        Returns:
            Dictionary with categorized questions
        """
        if not question_types:
            question_types = ["technical", "behavioral", "situational"]

        prompt = f"""
Generate {num_questions} interview questions for a {experience_level} level {job_role} position.

Key Skills to Assess: {', '.join(skills)}

Question Types to Include: {', '.join(question_types)}

Provide a JSON response with this structure:
{{
    "technical_questions": [
        {{
            "question": "question text",
            "difficulty": "easy/medium/hard",
            "skill_focus": "specific skill",
            "expected_answer_points": ["key point 1", "key point 2"]
        }}
    ],
    "behavioral_questions": [
        {{
            "question": "question text",
            "competency": "leadership/teamwork/communication/etc",
            "evaluation_criteria": ["criterion 1", "criterion 2"]
        }}
    ],
    "situational_questions": [
        {{
            "question": "scenario description",
            "skills_tested": ["skill1", "skill2"],
            "ideal_approach": "brief description of expected approach"
        }}
    ],
    "coding_challenges": [
        {{
            "problem": "problem description",
            "difficulty": "easy/medium/hard",
            "concepts": ["concept1", "concept2"],
            "hints": ["hint1", "hint2"]
        }}
    ]
}}

Ensure questions are:
- Appropriate for {experience_level} level
- Directly relevant to {job_role}
- Fair and bias-free
- Assess both technical competency and soft skills
"""

        messages = [
            {
                "role": "system",
                "content": "You are an expert technical interviewer and HR professional. Generate comprehensive, fair, and insightful interview questions.",
            },
            {"role": "user", "content": prompt},
        ]

        response = await self.chat(
            messages,
            model=self.model,
            options={"temperature": 0.6, "num_ctx": 6144},
            response_format="json",
        )

        return json.loads(response)

    async def analyze_skill_gaps(
        self,
        current_skills: list[str],
        target_role_skills: list[str],
        experience_years: int,
    ) -> dict[str, Any]:
        """Analyze skill gaps and provide personalized learning recommendations.
        
        Args:
            current_skills: Candidate's current skills
            target_role_skills: Skills required for target role
            experience_years: Years of experience
            
        Returns:
            Detailed skill gap analysis with learning paths
        """
        prompt = f"""
Analyze the skill gap between current skills and target role requirements:

Current Skills: {', '.join(current_skills)}
Target Role Skills: {', '.join(target_role_skills)}
Experience Level: {experience_years} years

Provide a comprehensive JSON analysis:
{{
    "missing_critical_skills": [
        {{
            "skill": "skill name",
            "importance": "critical/high/medium",
            "current_level": "none/beginner/intermediate",
            "target_level": "intermediate/advanced/expert",
            "estimated_learning_time": "time estimate",
            "learning_resources": [
                {{
                    "type": "course/book/project/certification",
                    "title": "resource name",
                    "platform": "platform name",
                    "difficulty": "beginner/intermediate/advanced",
                    "duration": "time estimate"
                }}
            ],
            "practice_projects": ["project idea 1", "project idea 2"],
            "assessment_criteria": ["how to measure mastery"]
        }}
    ],
    "skills_to_strengthen": [
        {{
            "skill": "skill name",
            "current_level": "beginner/intermediate",
            "improvement_areas": ["area1", "area2"],
            "advanced_topics": ["topic1", "topic2"],
            "quick_wins": ["actionable tip 1", "actionable tip 2"]
        }}
    ],
    "transferable_skills": [
        {{
            "skill": "existing skill",
            "relevance_to_target": "how it applies",
            "leverage_strategy": "how to highlight and use it"
        }}
    ],
    "learning_roadmap": {{
        "phase_1_foundation": {{
            "duration": "time period",
            "focus_areas": ["area1", "area2"],
            "milestones": ["milestone1", "milestone2"]
        }},
        "phase_2_development": {{
            "duration": "time period",
            "focus_areas": ["area1", "area2"],
            "milestones": ["milestone1", "milestone2"]
        }},
        "phase_3_mastery": {{
            "duration": "time period",
            "focus_areas": ["area1", "area2"],
            "milestones": ["milestone1", "milestone2"]
        }}
    }},
    "estimated_total_time": "overall time estimate",
    "priority_order": ["skill1", "skill2", "skill3"],
    "career_impact_score": {{"short_term": 0-100, "long_term": 0-100}}
}}
"""

        messages = [
            {
                "role": "system",
                "content": "You are an expert career coach and learning strategist. Provide detailed, actionable skill gap analysis with realistic timelines and resources.",
            },
            {"role": "user", "content": prompt},
        ]

        response = await self.chat(
            messages,
            model=self.model,
            options={"temperature": 0.4, "num_ctx": 8192},
            response_format="json",
        )

        return json.loads(response)

    async def simulate_mock_interview(
        self,
        job_role: str,
        question: str,
        candidate_answer: str,
        evaluation_criteria: list[str] | None = None,
    ) -> dict[str, Any]:
        """Evaluate a candidate's interview answer and provide feedback.
        
        Args:
            job_role: Job role context
            question: The interview question asked
            candidate_answer: Candidate's response
            evaluation_criteria: Specific criteria to evaluate against
            
        Returns:
            Detailed feedback and scoring
        """
        if not evaluation_criteria:
            evaluation_criteria = [
                "technical accuracy",
                "communication clarity",
                "problem-solving approach",
                "depth of knowledge",
                "practical experience",
            ]

        prompt = f"""
Evaluate this interview response for a {job_role} position:

Question: {question}

Candidate's Answer: {candidate_answer}

Evaluation Criteria: {', '.join(evaluation_criteria)}

Provide a comprehensive JSON evaluation:
{{
    "overall_score": 0-100,
    "dimension_scores": {{
        "technical_accuracy": {{
            "score": 0-100,
            "feedback": "detailed feedback",
            "strengths": ["strength1", "strength2"],
            "improvements": ["area1", "area2"]
        }},
        "communication_clarity": {{
            "score": 0-100,
            "feedback": "detailed feedback"
        }},
        "problem_solving": {{
            "score": 0-100,
            "feedback": "detailed feedback"
        }},
        "depth_of_knowledge": {{
            "score": 0-100,
            "feedback": "detailed feedback"
        }}
    }},
    "key_strengths": ["strength1", "strength2", "strength3"],
    "areas_for_improvement": [
        {{
            "area": "improvement area",
            "suggestion": "specific actionable advice",
            "example": "better way to phrase or approach"
        }}
    ],
    "missing_points": ["important point not mentioned"],
    "suggested_better_answer": "an improved version of the answer",
    "follow_up_questions": ["question1", "question2"],
    "interviewer_notes": "what an interviewer would think",
    "confidence_level": "low/moderate/high",
    "recommendation": "hire/maybe/no with reasoning"
}}
"""

        messages = [
            {
                "role": "system",
                "content": "You are an experienced technical interviewer providing constructive, detailed feedback on interview responses. Be fair, encouraging, and specific.",
            },
            {"role": "user", "content": prompt},
        ]

        response = await self.chat(
            messages,
            model=self.model,
            options={"temperature": 0.3, "num_ctx": 6144},
            response_format="json",
        )

        return json.loads(response)

    async def generate_career_roadmap(
        self,
        current_role: str,
        target_role: str,
        experience_years: int,
        current_skills: list[str],
        industry: str = "Technology",
    ) -> dict[str, Any]:
        """Generate a multi-year career progression roadmap.
        
        Args:
            current_role: Current job role
            target_role: Desired future role
            experience_years: Years of experience
            current_skills: Current skill set
            industry: Industry context
            
        Returns:
            Detailed career progression plan
        """
        prompt = f"""
Create a comprehensive career roadmap:

Current: {current_role} ({experience_years} years experience)
Target: {target_role}
Industry: {industry}
Current Skills: {', '.join(current_skills)}

Provide a strategic JSON roadmap:
{{
    "career_path": [
        {{
            "role": "intermediate role title",
            "timeline": "time to achieve",
            "key_responsibilities": ["resp1", "resp2"],
            "required_skills": ["skill1", "skill2"],
            "typical_salary_range": "range",
            "growth_opportunities": ["opportunity1", "opportunity2"]
        }}
    ],
    "milestone_checklist": [
        {{
            "milestone": "achievement description",
            "timeline": "when to achieve",
            "success_criteria": ["criterion1", "criterion2"],
            "resources_needed": ["resource1", "resource2"]
        }}
    ],
    "skill_development_plan": {{
        "year_1": {{
            "focus": ["focus area1", "focus area2"],
            "certifications": ["cert1", "cert2"],
            "projects": ["project type1", "project type2"],
            "networking": ["activity1", "activity2"]
        }},
        "year_2": {{
            "focus": ["focus area1", "focus area2"],
            "leadership_development": ["activity1", "activity2"],
            "specialization": ["area1", "area2"]
        }},
        "year_3_plus": {{
            "focus": ["advanced focus"],
            "thought_leadership": ["activity1", "activity2"],
            "strategic_goals": ["goal1", "goal2"]
        }}
    }},
    "alternative_paths": [
        {{
            "path_name": "alternative career direction",
            "description": "brief description",
            "pros": ["pro1", "pro2"],
            "cons": ["con1", "con2"],
            "transition_difficulty": "easy/moderate/challenging"
        }}
    ],
    "networking_strategy": {{
        "communities": ["community1", "community2"],
        "events": ["event type1", "event type2"],
        "mentorship": ["where to find mentors"],
        "personal_branding": ["tip1", "tip2"]
    }},
    "risk_mitigation": [
        {{
            "risk": "potential obstacle",
            "mitigation_strategy": "how to address it"
        }}
    ],
    "estimated_timeline_to_target": "realistic time estimate",
    "success_probability": {{"with_plan": "percentage", "factors": ["factor1", "factor2"]}}
}}
"""

        messages = [
            {
                "role": "system",
                "content": "You are a senior career advisor with deep knowledge of career progression paths, industry trends, and professional development. Provide realistic, actionable career roadmaps.",
            },
            {"role": "user", "content": prompt},
        ]

        response = await self.chat(
            messages,
            model=self.model,
            options={"temperature": 0.4, "num_ctx": 8192},
            response_format="json",
        )

        return json.loads(response)

    async def assess_competency(
        self,
        competency_name: str,
        evidence: str,
        role_level: str,
    ) -> dict[str, Any]:
        """Assess a specific competency based on evidence provided.
        
        Args:
            competency_name: Name of competency (e.g., "Leadership", "Problem Solving")
            evidence: Evidence text (resume, answer, project description)
            role_level: junior/mid/senior/expert
            
        Returns:
            Detailed competency assessment
        """
        prompt = f"""
Assess the competency '{competency_name}' for a {role_level} level role based on this evidence:

Evidence:
{evidence}

Provide a detailed JSON assessment:
{{
    "competency": "{competency_name}",
    "overall_rating": 0-100,
    "proficiency_level": "novice/competent/proficient/expert/master",
    "evidence_quality": "weak/moderate/strong/excellent",
    "demonstrated_behaviors": [
        {{
            "behavior": "specific behavior shown",
            "evidence_quote": "relevant excerpt",
            "strength": "low/medium/high"
        }}
    ],
    "missing_indicators": ["indicator1", "indicator2"],
    "development_recommendations": [
        {{
            "area": "what to improve",
            "action": "specific action to take",
            "expected_outcome": "what this will achieve"
        }}
    ],
    "benchmark_comparison": {{
        "vs_role_level": "above/at/below expectations for {role_level}",
        "percentile": 0-100,
        "gap_analysis": "description of gaps"
    }},
    "strengths": ["strength1", "strength2"],
    "growth_areas": ["area1", "area2"],
    "next_level_requirements": ["what's needed for next level"]
}}
"""

        messages = [
            {
                "role": "system",
                "content": "You are an expert in competency-based assessment and talent development. Provide thorough, evidence-based evaluations.",
            },
            {"role": "user", "content": prompt},
        ]

        response = await self.chat(
            messages,
            model=self.model,
            options={"temperature": 0.3, "num_ctx": 6144},
            response_format="json",
        )

        return json.loads(response)

    @staticmethod
    def _build_prompt(payload: dict[str, Any]) -> str:
        candidate = payload.get("candidate", {})
        skills = payload.get("skills", [])
        job_role = candidate.get("job_role", "the target role")

        bullet_skills = "\n".join(
            f"- {skill.get('name')} ({skill.get('category')} | confidence {skill.get('confidence', 0):.2f})"
            for skill in skills
        )

        return (
            "Create a transparent, bias-aware summary for the candidate below. "
            "Highlight key strengths, gaps against the role, and 2-3 learning suggestions.\n\n"
            f"Role: {job_role}\n"
            f"Candidate: {candidate.get('full_name')} ({candidate.get('email')})\n"
            f"Notable skills:\n{bullet_skills or '- No skills extracted yet.'}\n"
            f"Notes: {candidate.get('notes') or 'N/A'}"
        )


ollama_client = OllamaClient()
