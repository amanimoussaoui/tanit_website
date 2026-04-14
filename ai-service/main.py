"""
Tanit Talent AI — FastAPI microservice
Rule-based skill extraction + scoring; chat responses (extensible to HuggingFace).
"""
from __future__ import annotations

import re
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Tanit Talent AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

KNOWN_SKILLS = [
    "React",
    "Node.js",
    "PostgreSQL",
    "Python",
    "Docker",
    "TypeScript",
    "JavaScript",
    "Express",
    "Prisma",
    "FastAPI",
    "Tailwind",
    "AWS",
    "Kubernetes",
    "GraphQL",
    "Vue",
    "Angular",
    "Java",
    "Go",
    "Rust",
    "SQL",
    "MongoDB",
]


def extract_skills(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    found: set[str] = set()
    lower = text.lower()
    for skill in KNOWN_SKILLS:
        if skill.lower() in lower:
            found.add(skill)
    # token heuristic
    for word in re.findall(r"[A-Za-z][A-Za-z0-9+#.]{1,24}", text):
        if len(word) > 2 and word[0].isupper() and word not in found:
            if word.lower() in lower:
                found.add(word)
    return sorted(found)[:25]


def score_cv(text: str, skills: list[str]) -> int:
    base = 40
    base += min(40, len(skills) * 4)
    base += min(20, len(text) // 500)
    return max(0, min(100, base))


class ScoreIn(BaseModel):
    cv_text: str = ""


class ScoreOut(BaseModel):
    score: int
    skills: list[str]


@app.post("/score", response_model=ScoreOut)
def post_score(body: ScoreIn) -> ScoreOut:
    skills = extract_skills(body.cv_text)
    return ScoreOut(score=score_cv(body.cv_text, skills), skills=skills)


class MatchIn(BaseModel):
    userId: str
    jobId: str
    candidate_skills: list[str] = Field(default_factory=list)
    job_skills: list[str] = Field(default_factory=list)


class MatchOut(BaseModel):
    compatibility: int


@app.post("/match", response_model=MatchOut)
def post_match(body: MatchIn) -> MatchOut:
    a = {s.lower() for s in body.candidate_skills}
    b = {s.lower() for s in body.job_skills}
    if not b:
        return MatchOut(compatibility=72)
    overlap = len(a & b)
    pct = 55 + min(44, overlap * 12)
    return MatchOut(compatibility=min(99, pct))


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)


class ChatOut(BaseModel):
    reply: str
    message_id: str


def rule_reply(user_text: str) -> str:
    t = user_text.lower().strip()
    if not t:
        return "Hi! I’m Tanit AI. Ask me about jobs, your CV, or interview tips."
    if "job" in t or "emploi" in t:
        return "I can help you find roles that fit your skills. Try uploading your CV from the dashboard for a compatibility score."
    if "cv" in t or "resume" in t:
        return "Upload a PDF CV (max 5MB) on your candidate dashboard — I’ll extract skills and estimate your match strength."
    if "salary" in t or "salaire" in t:
        return "Salary ranges depend on role and location — filter jobs on the Browse page and compare listings."
    return (
        "Thanks for your message. Tanit Talent AI matches candidates using skills overlap and role context. "
        "What would you like to explore next?"
    )


@app.post("/chat", response_model=ChatOut)
def post_chat(body: ChatIn) -> ChatOut:
    last = ""
    for m in reversed(body.messages):
        if m.role == "user":
            last = m.content
            break
    return ChatOut(reply=rule_reply(last), message_id=str(uuid.uuid4()))


# In-memory mock suggestions; production would query Postgres / vector store
MOCK_JOBS: list[dict[str, Any]] = [
    {"id": "demo-1", "title": "Senior React Developer", "company": "TechCorp", "match": 94},
    {"id": "demo-2", "title": "Backend Engineer", "company": "DataFlow", "match": 88},
    {"id": "demo-3", "title": "Full Stack (Node)", "company": "StartupTN", "match": 81},
]


@app.get("/suggestions/{user_id}")
def get_suggestions(user_id: str) -> dict[str, Any]:
    _ = user_id
    return {"suggestions": MOCK_JOBS[:5]}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "tanit-fastapi"}

