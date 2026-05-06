"""Lightweight skill extraction and scoring helpers."""

from __future__ import annotations

import math
from collections import Counter
from typing import Iterable

from ..schemas import SkillInsight

# Basic catalog; in production load from Mongo or Neo4j
SKILL_LIBRARY: dict[str, str] = {
    "python": "technical",
    "fastapi": "technical",
    "react": "technical",
    "next.js": "technical",
    "mongodb": "technical",
    "redis": "technical",
    "minio": "technical",
    "nlp": "domain",
    "machine learning": "domain",
    "communication": "behavioral",
    "leadership": "behavioral",
    "problem solving": "cognitive",
}


def _tokenize(text: str) -> list[str]:
    sanitized = text.lower()
    return [token.strip(",.;:\n") for token in sanitized.split() if token]


def extract_skills(resume_text: str, extra_sources: Iterable[str] | None = None) -> list[SkillInsight]:
    corpus = resume_text
    if extra_sources:
        corpus += "\n" + "\n".join(extra_sources)

    tokens = _tokenize(corpus)
    counts = Counter(tokens)

    skills: list[SkillInsight] = []
    for skill_name, category in SKILL_LIBRARY.items():
        frequency = counts.get(skill_name.lower())
        if not frequency:
            continue
        confidence = 1 - math.exp(-frequency)
        skills.append(SkillInsight(name=skill_name, category=category, confidence=confidence))

    return sorted(skills, key=lambda s: s.confidence, reverse=True)
