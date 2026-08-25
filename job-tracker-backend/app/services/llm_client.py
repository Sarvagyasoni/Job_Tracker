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
from pydantic import BaseModel, ValidationError

from app.database import settings
from app.schemas import ATSScoreResponse

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


def generate_tailored_bullets(resume_text: str, job_description: str) -> list[str]:
    """Reads the user's saved resume and generates 5-8 achievement-oriented
    bullet points relevant to the given job description, grounded strictly
    in experience/skills actually present in the resume."""
    api_key = _require_api_key()

    resume_text = resume_text[:_MAX_RESUME_CHARS]
    job_description = job_description[:_MAX_JOB_DESCRIPTION_CHARS]

    system_prompt = (
        "You are a resume writing assistant. Read the given resume and generate "
        "5 to 8 strong, achievement-oriented resume bullet points that highlight "
        "the candidate's skills and experience most relevant to the given job "
        "description. Ground every bullet strictly in experience, projects, "
        "tools, and skills that are actually present in the resume - do NOT "
        "invent companies, roles, tools, metrics, or achievements that aren't "
        "implied by the resume content. Use strong action verbs, and quantify "
        "impact only where the resume itself supports a specific number. "
        "Return a JSON array of strings, one per bullet point, with no other "
        "text."
    )
    user_prompt = f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{job_description}"

    raw = _call_gemini(api_key, system_prompt, user_prompt, response_schema=list[str])

    try:
        parsed_data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an unreadable response. Please try again.",
        )

    if not isinstance(parsed_data, list) or not parsed_data or not all(
        isinstance(b, str) and b.strip() for b in parsed_data
    ):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an unexpected response format. Please try again.",
        )

    return parsed_data


class _SearchQuery(BaseModel):
    """Internal-only wrapper, not part of the public API schemas. Gemini's
    structured output mode is more reliable with an object at the top level
    than a bare string, even though the SDK doesn't reject a bare-string
    schema outright."""

    query: str


def generate_job_search_query(resume_text: str) -> str:
    """Reads the user's resume and generates a single, effective job-board
    search query (role + key skills) representing their strongest,
    most marketable position - used to auto-populate GET /jobs/suggested
    without the user having to type anything themselves."""
    api_key = _require_api_key()

    resume_text = resume_text[:_MAX_RESUME_CHARS]

    system_prompt = (
        "You are a job search assistant. Read the given resume and produce a "
        "single, effective job board search query (2-6 words - typically a "
        "job title plus 1-2 key skills, e.g. 'Backend Software Engineer "
        "Python FastAPI') that best represents this candidate's strongest, "
        "most marketable role based on their actual experience. This query "
        "will be used verbatim to search a live job board, so keep it "
        "concise and realistic - not a full sentence, not a list."
    )
    user_prompt = f"RESUME:\n{resume_text}"

    raw = _call_gemini(api_key, system_prompt, user_prompt, response_schema=_SearchQuery)

    try:
        parsed = _SearchQuery.model_validate_json(raw)
    except (ValidationError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an unreadable response. Please try again.",
        )

    query = parsed.query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an empty search query. Please try again.",
        )
    return query