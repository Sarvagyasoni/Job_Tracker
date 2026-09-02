"""Thin client wrapping the Gemini API (Google GenAI SDK) for resume-related
AI features:
- ATS compatibility scoring (resume vs job description)
- Resume bullet point generation (from the saved resume, tailored to a job)
- Job search query generation (from the saved resume, for /jobs/suggested)
- Enhanced resume content generation (for /resume/enhance's PDF output)

Uses Gemini's structured output mode (response_schema, tied directly to our
existing Pydantic response schemas) so the model is constrained server-side
to return JSON matching our schema, rather than just instructing it to
"return only JSON" in the prompt and hoping.

NOTE: even with response_mime_type="application/json", Gemini can still
occasionally wrap its output in a markdown code fence (```json ... ```) or
include leading/trailing whitespace - this was verified in production, not
just theorized, so every parse site strips fences defensively before
attempting json.loads()/model_validate_json().
"""

import json
import re

from fastapi import HTTPException, status
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from app.database import settings
from app.schemas import ATSScoreResponse, EnhancedResumeContent

_MAX_RESUME_CHARS = 15000  # generous - a resume is rarely more than a few thousand words
_MAX_JOB_DESCRIPTION_CHARS = 8000
_REQUEST_TIMEOUT_MS = 15000
_MAX_OUTPUT_TOKENS = 8192  # generous headroom - a truncated response is invalid JSON

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _strip_code_fence(text: str) -> str:
    """Defensively removes a markdown code fence Gemini occasionally wraps
    its JSON output in, despite response_mime_type="application/json"
    supposedly guaranteeing raw JSON. Confirmed happening in production, not
    just a theoretical edge case."""
    return _CODE_FENCE_RE.sub("", text).strip()


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
    their own try/except. Returns the raw JSON text (fences stripped) on
    success."""
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
                max_output_tokens=_MAX_OUTPUT_TOKENS,
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
    return _strip_code_fence(response.text)


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


def generate_job_search_query(resume_text: str | None = None, profile_context: str | None = None) -> str:
    """Generates a single, effective job-board search query representing
    the candidate's strongest, most marketable position - used to
    auto-populate GET /jobs/suggested without the user having to type
    anything themselves.

    resume_text (parsed from an uploaded resume) signals what the
    candidate can actually do; profile_context (the user's self-reported
    desired role/skills/location/remote/employment-type preferences from
    GET /profile) signals what they're looking for. Either may be omitted,
    but at least one must be provided - callers (see app/routers/jobs.py)
    only reach this function once they've confirmed the user has a resume
    and/or a profile on file."""
    if not resume_text and not profile_context:
        raise ValueError("generate_job_search_query requires resume_text and/or profile_context")

    api_key = _require_api_key()

    prompt_parts = []
    if resume_text:
        prompt_parts.append(f"RESUME:\n{resume_text[:_MAX_RESUME_CHARS]}")
    if profile_context:
        prompt_parts.append(f"CANDIDATE STATED PREFERENCES:\n{profile_context}")
    user_prompt = "\n\n".join(prompt_parts)

    system_prompt = (
        "You are a job search assistant. Read the given candidate resume "
        "and/or stated job preferences and produce a single, effective job "
        "board search query (2-8 words - typically a job title plus 1-3 "
        "key skills/qualifiers, e.g. 'Senior Backend Engineer Python "
        "FastAPI Remote') that best represents this candidate's strongest, "
        "most marketable, most relevant role. When a resume is given, base "
        "the role and skills primarily on the candidate's actual "
        "experience there. When stated preferences are also given, use "
        "them to refine the query - e.g. prefer their desired job title if "
        "it's a reasonable fit for their background, append a stated "
        "location or 'remote', and reflect their experience level or "
        "employment type (e.g. 'internship', 'contract') if given. If only "
        "preferences are given (no resume), build the query directly from "
        "those. This query will be used verbatim to search a live job "
        "board, so keep it concise and realistic - not a full sentence, "
        "not a list."
    )

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


def generate_enhanced_resume_content(
    resume_text: str, job_description: str
) -> EnhancedResumeContent:
    """Reads the user's saved resume and reorganizes it into sections
    (Summary, Skills, Experience, etc.) tailored to highlight relevance to
    the given job description, for rendering into a downloadable PDF.
    Grounded strictly in the original resume's actual content - does not
    invent companies, titles, dates, degrees, or metrics."""
    api_key = _require_api_key()

    resume_text = resume_text[:_MAX_RESUME_CHARS]
    job_description = job_description[:_MAX_JOB_DESCRIPTION_CHARS]

    system_prompt = (
        "You are a resume writing assistant. Read the given resume and "
        "reorganize/rewrite it into a clean, well-structured resume as a "
        "list of sections (e.g. Summary, Skills, Experience, Education - "
        "use whatever sections genuinely fit this resume's actual content). "
        "Each section has a heading, and EITHER a short prose paragraph "
        "(good for a Summary) OR a list of bullet_points (good for "
        "Experience/Skills), or both if that fits. Tailor the emphasis and "
        "terminology toward the given job description where honestly "
        "applicable, but do NOT invent employers, job titles, dates, "
        "degrees, certifications, or metrics that are not present in or "
        "clearly implied by the original resume - only reorganize, "
        "rephrase, and re-emphasize what's actually there."
    )
    user_prompt = f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{job_description}"

    raw = _call_gemini(
        api_key, system_prompt, user_prompt, response_schema=EnhancedResumeContent
    )

    try:
        parsed = EnhancedResumeContent.model_validate_json(raw)
    except (ValidationError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned an unreadable response. Please try again.",
        )

    return parsed