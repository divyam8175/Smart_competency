import json
import logging
from typing import Any

from app.services.ollama_client import OllamaClient

logger = logging.getLogger(__name__)


class CompatibilityAnalyzer:
    def __init__(self):
        self.client = OllamaClient()

    async def analyze_compatibility(
        self,
        candidate_profile: dict,
        job_description: dict
    ) -> dict:
        """
        Analyze compatibility between candidate profile and job description.
        Returns detailed percentage-based metrics for visualization.
        """
        prompt = self._build_analysis_prompt(candidate_profile, job_description)

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert HR analyst and career counselor. Analyze the candidate's profile against "
                    "the job description and provide detailed compatibility metrics as percentages. Return a valid "
                    "JSON object only, with no markdown formatting or extra commentary."
                ),
            },
            {"role": "user", "content": prompt},
        ]

        try:
            content = await self.client.chat(
                messages,
                options={"temperature": 0.3, "num_ctx": 6144},
                response_format="json",
            )
            logger.info("Ollama analysis response: %s", content)
            analysis = json.loads(content)
            return self._validate_and_format_analysis(analysis)
        except Exception as exc:
            logger.error("Compatibility analysis failed (%s): %s", type(exc).__name__, exc)
            raise

    async def generate_learning_roadmap(
        self,
        candidate_profile: dict,
        job_description: dict,
        target_role: str | None = None,
    ) -> dict:
        """Generate a personalized learning roadmap aligned to the target role."""
        prompt = self._build_roadmap_prompt(candidate_profile, job_description, target_role)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert career coach and learning strategist. Build actionable, time-bound roadmaps in "
                    "JSON with no markdown formatting. Respond with strictly valid JSON only. Do not include any "
                    "explanations, and never insert raw newline characters inside string values; replace them with spaces "
                    "or literal \\n sequences."
                ),
            },
            {"role": "user", "content": prompt},
        ]

        for attempt in range(2):
            content = ""
            try:
                content = await self.client.chat(
                    messages,
                    options={"temperature": 0.4, "num_ctx": 2048},
                    response_format="json",
                )
                logger.info("Ollama roadmap response: %s", content)
                roadmap = json.loads(content)
                return self._validate_roadmap(roadmap)
            except json.JSONDecodeError as decode_error:
                repaired = self._attempt_json_repair(content)
                if repaired is not None:
                    logger.info("Roadmap JSON repaired after normalization; using recovered payload.")
                    return self._validate_roadmap(repaired)
                logger.warning(
                    "Roadmap JSON parse failed (attempt %s): %s | content preview: %s",
                    attempt + 1,
                    decode_error,
                    content[:500],
                )
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Your previous reply was not valid JSON because of this parser error: "
                            f"{decode_error}. Respond again with the complete roadmap as valid JSON matching the requested "
                            "schema. Output JSON only with property names wrapped in double quotes, and never include raw "
                            "newline characters inside string values."
                        ),
                    }
                )
                continue
            except Exception as exc:
                logger.error("Roadmap generation failed (%s): %s", type(exc).__name__, exc)
                raise

        raise ValueError("Ollama returned invalid JSON twice in a row.")

    def _build_analysis_prompt(self, candidate: dict, job: dict) -> str:
        candidate_section = f"""
CANDIDATE PROFILE:
- Name: {candidate.get('full_name', 'N/A')}
- Current Role: {candidate.get('current_role', 'N/A')}
- Experience: {candidate.get('experience_years', 0)} years
- Education: {candidate.get('education', 'N/A')}
- Skills: {', '.join(candidate.get('skills', []))}
- Resume Summary: {candidate.get('resume_text', 'N/A')[:500]}
""".strip()

        job_section = f"""
JOB DESCRIPTION:
- Title: {job.get('title', 'N/A')}
- Description: {job.get('description', 'N/A')}
- Required Skills: {', '.join(job.get('required_skills', []))}
- Experience Required: {job.get('experience_required', 'N/A')} years
- Responsibilities: {job.get('responsibilities', 'N/A')}
- Qualifications: {job.get('qualifications', 'N/A')}
""".strip()

        instructions = """
Provide a detailed analysis with the following JSON structure:
{
    "overall_match": <percentage 0-100>,
    "skills_match": <percentage 0-100>,
    "experience_match": <percentage 0-100>,
    "education_match": <percentage 0-100>,
    "responsibility_match": <percentage 0-100>,
    "strengths": ["strength1", "strength2", "strength3"],
    "gaps": ["gap1", "gap2"],
    "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
    "detailed_analysis": "A comprehensive paragraph explaining the match, strengths, gaps, and growth potential",
    "scorecard": {
        "technical_skill_index": <percentage 0-100>,
        "cognitive_ability_index": <percentage 0-100>,
        "behavioral_fit_score": <percentage 0-100>,
        "learning_agility_score": <percentage 0-100>,
        "growth_potential_score": <percentage 0-100>,
        "job_role_match": <percentage 0-100>,
        "best_fit_roles": ["role A", "role B", "role C"],
        "strength_summary": "2 sentence summary of the candidate's biggest strengths",
        "weakness_summary": "2 sentence summary of the most critical improvement areas"
    }
}

Calculate percentages based on:
- Skills match: How many required skills does the candidate have?
- Experience match: Does experience level align with requirements?
- Education match: Does education background fit the role?
- Responsibility match: Can the candidate handle the responsibilities?
- Overall match: Weighted average considering all factors

When proposing "best_fit_roles", include only 3-5 concise role titles that align with the candidate's background.

"scorecard" data will be used for interactive radar charts, so make the indices comparable (0-100 scale) and grounded in the candidate/job context.

Be honest and realistic in your assessment.
""".strip()

        return (
            "Analyze the compatibility between this candidate and job description:\n\n"
            f"{candidate_section}\n\n"
            f"{job_section}\n\n"
            f"{instructions}"
        )

    def _build_roadmap_prompt(
        self,
        candidate: dict,
        job: dict,
        target_role: str | None = None,
    ) -> str:
        candidate_section = f"""
CANDIDATE OVERVIEW
- Name: {candidate.get('full_name', 'N/A')}
- Current Role: {candidate.get('current_role', 'N/A')}
- Years of Experience: {candidate.get('experience_years', 0)}
- Education: {candidate.get('education', 'N/A')}
- Core Skills: {', '.join(candidate.get('skills', [])) or 'Not provided'}
""".strip()

        job_section = f"""
TARGET ROLE SUMMARY
- Target Role: {target_role or job.get('title', 'N/A')}
- Description: {job.get('description', 'N/A')}
- Required Skills: {', '.join(job.get('required_skills', []))}
- Responsibilities: {job.get('responsibilities', 'N/A')}
- Qualifications: {job.get('qualifications', 'N/A')}
""".strip()

        roadmap_schema = (
            "Return JSON with this schema and fill every field:\n"
            "{\n"
            '  "headline": "One sentence describing the roadmap focus",\n'
            '  "goal_summary": "3-4 sentence overview of the learning journey",\n'
            '  "phases": [\n'
            '    {\n'
            '      "title": "Phase name",\n'
            '      "duration": "e.g., Weeks 1-2",\n'
            '      "focus": "Primary skills or competencies",\n'
            '      "outcomes": ["measurable outcome", "measurable outcome"],\n'
            '      "actions": [\n'
            '        {\n'
            '          "title": "Action item",\n'
            '          "description": "1-2 sentence description",\n'
            '          "resources": ["resource or course name", "article or tool"]\n'
            '        }\n'
            '      ]\n'
            '    }\n'
            '  ],\n'
            '  "quick_wins": ["fast improvement area", "fast improvement area"],\n'
            '  "ongoing_habits": ["practice", "practice"],\n'
            '  "suggested_resources": ["resource + why it helps"],\n'
            '  "success_metrics": ["metric to track", "metric to track"]\n'
            "}\n"
        )

        guidance = (
            "Make the roadmap specific to the candidate's gaps versus the target role."
            " Balance momentum (quick wins) with depth (longer phases)."
            " Include concrete tools, courses, or deliverables wherever possible."
            " IMPORTANT: Never place raw newline characters inside JSON string values; keep each string on a single line."
        )

        return (
            "Design a personalized learning roadmap that helps the candidate reach the target role.\n\n"
            f"{candidate_section}\n\n"
            f"{job_section}\n\n"
            f"{roadmap_schema}\n\n{guidance}"
        )

    def _validate_and_format_analysis(self, analysis: dict) -> dict:
        """Ensure all required fields are present with valid values."""
        required_fields = {
            "overall_match": 0.0,
            "skills_match": 0.0,
            "experience_match": 0.0,
            "education_match": 0.0,
            "responsibility_match": 0.0,
            "strengths": [],
            "gaps": [],
            "recommendations": [],
            "detailed_analysis": "Analysis unavailable"
        }
        
        for field, default in required_fields.items():
            if field not in analysis:
                analysis[field] = default
            elif field.endswith("_match") or field == "overall_match":
                # Ensure percentage is between 0 and 100
                analysis[field] = max(0.0, min(100.0, float(analysis[field])))
        
        default_scorecard = {
            "technical_skill_index": 0.0,
            "cognitive_ability_index": 0.0,
            "behavioral_fit_score": 0.0,
            "learning_agility_score": 0.0,
            "growth_potential_score": 0.0,
            "job_role_match": 0.0,
            "best_fit_roles": [],
            "strength_summary": "",
            "weakness_summary": "",
        }

        scorecard = analysis.get("scorecard") or {}
        formatted_scorecard: dict[str, Any] = {}

        for field, default in default_scorecard.items():
            value = scorecard.get(field, default)
            if isinstance(default, float):
                formatted_scorecard[field] = max(0.0, min(100.0, float(value)))
            elif isinstance(default, list):
                if not isinstance(value, list):
                    value = [value]
                formatted_scorecard[field] = [str(role) for role in value][:5]
            else:
                formatted_scorecard[field] = str(value) if value else default

        analysis["scorecard"] = formatted_scorecard
        
        return analysis

    def _validate_roadmap(self, roadmap: dict) -> dict:
        """Ensure roadmap payload matches the expected schema."""
        defaults = {
            "headline": "Personalized learning roadmap",
            "goal_summary": "",
            "phases": [],
            "quick_wins": [],
            "ongoing_habits": [],
            "suggested_resources": [],
            "success_metrics": [],
        }

        for key, default in defaults.items():
            if key not in roadmap:
                roadmap[key] = default

        if not isinstance(roadmap["quick_wins"], list):
            roadmap["quick_wins"] = [str(roadmap["quick_wins"])]
        if not isinstance(roadmap["ongoing_habits"], list):
            roadmap["ongoing_habits"] = [str(roadmap["ongoing_habits"])]
        if not isinstance(roadmap["suggested_resources"], list):
            roadmap["suggested_resources"] = [str(roadmap["suggested_resources"])]
        if not isinstance(roadmap["success_metrics"], list):
            roadmap["success_metrics"] = [str(roadmap["success_metrics"])]

        normalized_phases = []
        phases = roadmap.get("phases", []) or []
        for phase in phases[:5]:
            normalized_phase = {
                "title": str(phase.get("title", "Phase")) or "Phase",
                "duration": str(phase.get("duration", "")) or "",
                "focus": str(phase.get("focus", "")) or "",
                "outcomes": [str(item) for item in (phase.get("outcomes") or [])][:4],
                "actions": [],
            }

            for action in (phase.get("actions") or [])[:5]:
                normalized_phase["actions"].append(
                    {
                        "title": str(action.get("title", "Action")) or "Action",
                        "description": str(action.get("description", "")) or "",
                        "resources": [str(r) for r in (action.get("resources") or [])][:5],
                    }
                )

            normalized_phases.append(normalized_phase)

        roadmap["phases"] = normalized_phases
        return roadmap

    def _attempt_json_repair(self, raw_content: str) -> dict | None:
        """Try recovering common formatting mistakes like raw newlines inside strings."""
        normalized = self._normalize_json_strings(raw_content)
        if normalized == raw_content:
            return None
        try:
            return json.loads(normalized)
        except json.JSONDecodeError:
            return None

    def _normalize_json_strings(self, raw_content: str) -> str:
        cleaned_chars: list[str] = []
        in_string = False
        escape_next = False

        for char in raw_content:
            if char == '"' and not escape_next:
                in_string = not in_string
                cleaned_chars.append(char)
                continue

            if char == '\\' and not escape_next:
                escape_next = True
                cleaned_chars.append(char)
                continue

            if escape_next:
                escape_next = False
                cleaned_chars.append(char)
                continue

            if in_string:
                if char == '\r':
                    # Drop carriage returns; JSON only needs \n when necessary.
                    continue
                if char == '\n':
                    cleaned_chars.extend(['\\', 'n'])
                    continue

            cleaned_chars.append(char)

        if in_string:
            cleaned_chars.append('"')

        return "".join(cleaned_chars)


# Singleton instance
compatibility_analyzer = CompatibilityAnalyzer()
