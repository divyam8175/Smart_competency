import PyPDF2
import io
from typing import Optional

import re


async def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file bytes."""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def parse_resume_text(resume_text: str) -> dict:
    """Parse resume text to extract structured information."""
    # Simple extraction logic - can be enhanced with NLP
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    
    result = {
        "skills": [],
        "education": "",
        "experience_years": 0
    }
    
    # Look for common skill keywords
    skill_keywords = [
        "python", "javascript", "java", "c++", "react", "angular", "vue",
        "node.js", "django", "flask", "fastapi", "mongodb", "postgresql",
        "mysql", "aws", "azure", "docker", "kubernetes", "git", "ci/cd",
        "machine learning", "deep learning", "nlp", "data science",
        "html", "css", "typescript", "sql", "nosql", "redis", "graphql"
    ]
    
    text_lower = resume_text.lower()
    for skill in skill_keywords:
        if skill in text_lower:
            result["skills"].append(skill)
    
    # Look for education keywords
    education_keywords = ["bachelor", "master", "phd", "b.tech", "m.tech", "mba", "degree"]
    for line in lines:
        line_lower = line.lower()
        if any(edu in line_lower for edu in education_keywords):
            result["education"] = line
            break
    
    # Try to estimate experience years (look for "X years" pattern)
    experience_match = re.search(r'(\d+)\s*\+?\s*years?', text_lower)
    if experience_match:
        result["experience_years"] = int(experience_match.group(1))
    
    return result


def parse_job_description(text: str) -> dict:
    """Parse job description text into structured fields."""
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    if not lines:
        return {
            "title": "",
            "description": text.strip(),
            "required_skills": [],
            "experience_required": None,
            "responsibilities": "",
            "qualifications": "",
        }

    title = lines[0][:120]
    sections = {
        "description": [],
        "responsibilities": [],
        "qualifications": [],
        "requirements": [],
    }

    section_map = {
        "responsibilities": ["responsibil"],
        "qualifications": ["qualification", "eligibility"],
        "requirements": ["requirement", "skills", "must have", "nice to have"],
    }

    current_section = "description"
    for line in lines[1:]:
        normalized = line.lower().rstrip(":")
        matched_section = None
        for section, keywords in section_map.items():
            if any(keyword in normalized for keyword in keywords):
                matched_section = section
                break

        if matched_section:
            current_section = matched_section
            continue

        sections[current_section].append(line)

    description_text = "\n".join(sections["description"]).strip() or text.strip()
    responsibilities_text = "\n".join(sections["responsibilities"]).strip()
    qualifications_text = "\n".join(sections["qualifications"]).strip()

    requirement_lines = sections["requirements"]
    if not requirement_lines and responsibilities_text:
        # Fall back to bullet responsibilities if requirements missing
        requirement_lines = [line for line in sections["responsibilities"] if len(line.split()) <= 8]

    required_skills = []
    for line in requirement_lines:
        cleaned = line.lstrip("-•* ")
        if cleaned:
            required_skills.append(cleaned)

    experience_required = None
    experience_matches = re.findall(r"(\d+)\s*\+?\s*years?", text.lower())
    if experience_matches:
        experience_required = max(int(num) for num in experience_matches)

    return {
        "title": title,
        "description": description_text,
        "required_skills": required_skills,
        "experience_required": experience_required,
        "responsibilities": responsibilities_text,
        "qualifications": qualifications_text,
    }
