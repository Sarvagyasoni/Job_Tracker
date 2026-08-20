"""Thin client wrapping the Gemini API (Google GenAI SDK) for two features:
- ATS compatibility scoring (resume vs job description)
- Resume bullet point tailoring (rewriting bullets to highlight relevant skills)

Uses Gemini's structured output mode (response_schema, tied directly to our
existing Pydantic response schemas) so the model is constrained server-side
to return JSON matching our schema, rather than just instructing it to
"return only JSON" in the prompt and hoping - this is meaningfully more
reliable than prompt-only JSON instructions, and means we don't need to
defensively strip markdown code fences the way a plain-text-mode call would.

Kept separate from the router so the prompt logic and parsing are easy to
test without needing a live API key or a running server.
"""

import json

from fastapi import HTTPException, status
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.database import settings
from app.schemas import ATSScoreResponse, TailoredBullet

_MAX_RESUME_CHARS = 15000  # generous - a resume is rarely more than a few thousand words
_MAX_JOB_DESCRIPTION_CHARS = 8000
_REQUEST_TIMEOUT_MS = 15000


def _require_api_key() -> str:
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "This feature is not configured: GEMINI_API_KEY is missing. "
                "Add it to your .env to enable AI-powered resume features."
            ),
        )
    return settings.gemini_api_key


def _call_gemini(api_key: str, system_prompt: str, user_prompt: str, response_schema) -> str:
    """Makes the actual API call with structured output enforced server-side.
    Raises HTTPException on any provider-side failure, so callers don't need
    their own try/except. Returns the raw JSON text on success."""
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=_REQUEST_TIMEOUT_MS),
    )
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=2000,
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
    except errors.APIError as e:
        if e.code in (401, 403):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI provider rejected our API key. Check GEMINI_API_KEY.",
            )
        if e.code == 429:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI provider rate limit reached. Please try again shortly.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an unexpected error.",
        )
    except HTTPException:
        raise
    except Exception:
        # Covers network-level failures (timeouts, connection refused, DNS
        # failures, etc.) which surface as plain exceptions rather than a
        # google.genai.errors.APIError.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the AI provider. Please try again.",
        )

    if not response.text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an empty response. Please try again.",
        )
    return response.text


def score_resume_against_job(resume_text: str, job_description: str) -> dict:
    api_key = _require_api_key()

    resume_text = resume_text[:_MAX_RESUME_CHARS]
    job_description = job_description[:_MAX_JOB_DESCRIPTION_CHARS]

    system_prompt = (
        "You are an ATS (Applicant Tracking System) resume screening assistant. "
        "Compare the given resume against the given job description and assess "
        "how well the resume matches, the way an automated ATS keyword scanner "
        "would. match_score is an integer 0-100. matched_keywords are important "
        "skills/terms from the job description that DO appear in the resume. "
        "missing_keywords are important skills/terms from the job description "
        "that do NOT appear in the resume. summary is a 2-3 sentence plain-"
        "English explanation of the score."
    )
    user_prompt = f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{job_description}"

    raw = _call_gemini(api_key, system_prompt, user_prompt, response_schema=ATSScoreResponse)

    try:
        parsed = ATSScoreResponse.model_validate_json(raw)
    except (ValidationError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an unreadable response. Please try again.",
        )

    # Clamp defensively - the schema only declares match_score as an
    # integer, not a 0-100 range, so a model could still return something
    # outside that range despite everything else being well-formed.
    parsed.match_score = max(0, min(100, parsed.match_score))
    return parsed.model_dump()


def tailor_bullet_points(bullet_points: list[str], job_description: str) -> list[TailoredBullet]:
    api_key = _require_api_key()

    job_description = job_description[:_MAX_JOB_DESCRIPTION_CHARS]
    bullets_block = "\n".join(f"{i + 1}. {b}" for i, b in enumerate(bullet_points))

    system_prompt = (
        "You are a resume writing assistant. Rewrite each given resume bullet "
        "point to better highlight skills and terminology relevant to the given "
        "job description. Do NOT invent new experience, tools, metrics, or "
        "achievements that aren't implied by the original bullet - only "
        "rephrase, reframe emphasis, and use terminology that matches the job "
        "description where it's honestly applicable. Return one object per "
        "bullet, in the same order as given, with 'original' set to the exact "
        "original bullet text and 'tailored' set to the rewritten version."
    )
    user_prompt = f"JOB DESCRIPTION:\n{job_description}\n\nBULLET POINTS:\n{bullets_block}"

    raw = _call_gemini(
        api_key, system_prompt, user_prompt, response_schema=list[TailoredBullet]
    )

    try:
        parsed_data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an unreadable response. Please try again.",
        )

    if not isinstance(parsed_data, list) or len(parsed_data) != len(bullet_points):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned a mismatched number of results. Please try again.",
        )

    try:
        return [TailoredBullet.model_validate(item) for item in parsed_data]
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an incomplete response. Please try again.",
        )