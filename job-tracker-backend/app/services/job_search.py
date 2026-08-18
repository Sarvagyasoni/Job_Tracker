"""Thin client for the OpenWeb Ninja JSearch API, used by GET /jobs/search.

Docs: https://www.openwebninja.com/api/jsearch/docs
This is the *direct* OpenWeb Ninja API (auth via a single x-api-key header),
not the RapidAPI-marketplace-hosted version of the same underlying data -
OpenWeb Ninja's own docs confirm both routes serve identical endpoints,
parameters, and response shapes, so only the host/auth/response-envelope
differ here; the per-listing field names (job_title, employer_name, etc.)
are the same either way.

This module only knows how to call JSearch and reshape its response into
our own JobSearchResult schema. It never touches the database - saving a
result into a user's tracked list still goes through the existing
POST /jobs endpoint.
"""

from typing import Optional

import httpx
from fastapi import HTTPException, status

from app.database import settings
from app.schemas import JobSearchResult

JSEARCH_SEARCH_URL = "https://api.openwebninja.com/jsearch/search-v2"

_DESCRIPTION_PREVIEW_CHARS = 300


def _truncate(text: Optional[str], max_chars: int) -> Optional[str]:
    if not text:
        return None
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "..."


def _map_listing(listing: dict) -> JobSearchResult:
    """Map a single raw JSearch listing into our JobSearchResult schema."""
    city = listing.get("job_city")
    country = listing.get("job_country")
    location = ", ".join(part for part in [city, country] if part) or None

    return JobSearchResult(
        company=listing.get("employer_name") or "Unknown company",
        role=listing.get("job_title") or "Unknown role",
        link=listing.get("job_apply_link") or listing.get("job_google_link"),
        notes=_truncate(listing.get("job_description"), _DESCRIPTION_PREVIEW_CHARS),
        location=location,
        posted_at=listing.get("job_posted_at_datetime_utc"),
    )


async def search_jobs(query: str, page: int = 1, remote_only: bool = False) -> list[JobSearchResult]:
    """Search JSearch for the given query. Raises HTTPException on any
    failure (missing config, upstream error, timeout) so the router can
    stay simple.

    Note: OpenWeb Ninja recommends cursor-based pagination on /search-v2 for
    fetching beyond the first page. We only fetch a single page here (the
    `page` param is passed through in case the API honors it, but a cursor
    parameter isn't wired up yet) - fine for "search and save one job",
    which is this endpoint's actual use case.
    """

    if not settings.jsearch_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Job search is not configured: JSEARCH_API_KEY is missing. "
                "Add it to your .env to enable GET /jobs/search."
            ),
        )

    params = {"query": query, "page": str(page), "num_pages": "1"}
    if remote_only:
        params["remote_jobs_only"] = "true"

    headers = {"x-api-key": settings.jsearch_api_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(JSEARCH_SEARCH_URL, params=params, headers=headers)
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Job search provider timed out. Please try again.",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the job search provider.",
        )

    if resp.status_code in (401, 403):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Job search provider rejected our API key. Check JSEARCH_API_KEY.",
        )
    if resp.status_code == 429:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Job search rate limit reached. Please try again shortly.",
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Job search provider returned an unexpected error ({resp.status_code}).",
        )

    try:
        body = resp.json()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Job search provider returned an unreadable response.",
        )

    # OpenWeb Ninja wraps results as {"status": "OK", "data": {"jobs": [...], "cursor": "..."}}
    # (unlike the RapidAPI-marketplace version, which returns {"data": [...]} directly).
    listings = (body.get("data") or {}).get("jobs") or []
    return [_map_listing(listing) for listing in listings]
