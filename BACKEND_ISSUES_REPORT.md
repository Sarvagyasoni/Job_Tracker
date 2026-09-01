# Backend Issues Report

> **Note for backend team:** This file tracks known issues in `job-tracker-backend/`.
> The frontend team does not modify anything inside the backend folder; entries here
> are recorded based on read-only audits of the backend code. Please update statuses
> when items are resolved.

## Critical

### 0. Live secrets in working tree
**File:** `job-tracker-backend/.env`
- A real `JWT_SECRET`, live `JSEARCH_API_KEY`, and live `GEMINI_API_KEY` are present
  on disk (the file is gitignored, but the values are real and must be treated as
  compromised).
- The file is not in the latest git index, but it lives in the working tree and can
  leak via any backup, sync, cloud IDE, or accidental `git add -A`.
- **Action:** Rotate all three secrets immediately in their respective dashboards,
  then regenerate the local `.env` from `.env.example`. Consider adding a pre-commit
  hook (e.g. `gitleaks`) so this never recurs.

---

## High

### 1. `docker-compose.yml` references a missing `Dockerfile`
**File:** `docker-compose.yml:20` → `build: ./job-tracker-backend`
- No `Dockerfile` (or `Dockerfile.dev`) exists in `job-tracker-backend/`.
- `docker compose up --build` fails immediately at the build step.
- **Frontend mitigation:** the broken `backend` service was commented out in
  `docker-compose.yml` (see commit history). The `db` service still works.
- **Backend action:** Add a `Dockerfile` (Python 3.11+ slim, install
  `requirements.txt`, run `uvicorn app.main:app --host 0.0.0.0 --port 8000`).
  Also add a `.dockerignore` so `venv/`, `__pycache__/`, `.env`, and `.pytest_cache/`
  don't leak into the image.

### 2. Compose uses placeholder JWT secret
**File:** `docker-compose.yml:25` → `JWT_SECRET: your-secret-here`
- If the Dockerfile ever gets added without also rotating this, anyone who can
  read the repo can mint valid JWTs for any user.
- **Backend action:** Read `JWT_SECRET` from a `.env` file or secret manager, never
  hard-code it in compose. The frontend has documented the same requirement in
  `HANDOVER.md`.

---

## Medium

### 1. Tailor Bullets returns "Unreadable Response" (breaks feature)
**File:** `app/services/llm_client.py:171`
- `generate_tailored_bullets()` passes `response_schema=list[str]` (bare Python
  type) to Gemini.
- Google GenAI SDK structured output requires a Pydantic model, not bare types.
- The same file already uses wrapper models correctly elsewhere
  (`_SearchQuery`, `ATSScoreResponse`).
- **Symptom:** Endpoint always returns 502 with "AI provider returned an
  unreadable response" — feature is dead end-to-end.
- **Fix:** Create a `_BulletList` wrapper Pydantic model (like `_SearchQuery` at
  the same file) and pass that as `response_schema`.

### 2. Health check doesn't verify the database
**File:** `app/main.py:51-53`
- `GET /health` returns `{"status": "ok"}` without any DB connectivity check.
- Container orchestrators (k8s, ECS, docker compose with healthchecks) cannot
  detect a broken Postgres connection.
- **Fix:** Add a `SELECT 1` (or equivalent) inside the handler; return 503 on
  failure.

### 3. `date_applied` default is frozen at server-start
**File:** `app/models.py:70`
- `date_applied = Column(Date, nullable=True, default=date.today)` evaluates
  `date.today` **once at module import time**, not per row.
- Every new `Job` gets the same `date_applied` value: the day the server first
  started.
- **Fix:** `default=lambda: date.today()` or wrap in a function.

### 4. JSearch pagination silently broken for `page > 1`
**Files:** `app/services/job_search.py:60-64`, `app/routers/jobs.py:44-55`
- Service hard-codes `num_pages: "1"` and never uses the cursor the API returns.
- Frontend's "Load More" (in `useJobs.useJobSearch` and `useJobs.useSuggestedJobs`)
  increments `?page=N` and expects fresh results, but gets duplicates of page 1.
- **Symptom:** "Load More" appears to work but returns identical results.
- **Fix:** Wire the API's `nextPage` cursor through `job_search.py` and accept
  it from the frontend's `?cursor=` param (replacing or supplementing `?page=`).

### 5. LLM timeout too aggressive for `enhance_resume`
**File:** `app/services/llm_client.py:33` → `_REQUEST_TIMEOUT_MS = 15000`
- 15s is OK for `score_resume_against_job` but too tight for
  `generate_enhanced_resume_content` (full resume reorg + PDF render).
- Frontend axios default is also 15s (`job-tracker-frontend/src/api/axiosInstance.ts:6`).
- **Symptom:** Enhance PDF frequently returns 504 under any load.
- **Fix:** Per-call timeout overrides; e.g. 60s for `enhance_resume`, 20s for
  `ats_score` and `tailor_bullets`. Frontend axios timeout for the enhance
  endpoint should also be raised.

### 6. `enhance_resume` error path leaks server shape to client
**Files:** `app/routers/resume.py:124-144`, frontend `src/hooks/useResume.ts:108-145`
- Backend returns `application/pdf` on success but `application/json` on errors.
- Frontend uses `responseType: 'blob'` and has to defensively re-parse the blob
  by MIME type and surface `detail`. Tight coupling to backend error shape.
- **Fix (backend):** Always return `application/pdf`; embed error details as
  JSON inside a wrapper PDF, or document the contract and remove the
  client-side blob-MIME dance. (This one is on the backend — frontend will
  keep the workaround until the contract stabilizes.)

---

## Low

### 7. `datetime.utcnow()` is deprecated and returns naive datetimes
**Files:** `app/models.py:32, 56, 74, 75`, `app/routers/resume.py:58`
- Deprecated in Python 3.12+; returns naive datetimes that conflict with the
  timezone-aware `datetime.now(timezone.utc)` in `app/auth.py:29`.
- No current crash (no comparison of aware/naive columns today) but a latent
  bug.
- **Fix:** `datetime.now(timezone.utc)` (and persist with `DateTime(timezone=True)`
  if migrating to tz-aware columns).

### 8. `_get_own_resume_or_404` is a private cross-router import
**File:** `app/routers/jobs.py:10`
- Imports `_get_own_resume_or_404` (leading underscore) from sibling router
  `app/routers/resume.py`. Works today but is a layer smell; routers should
  not depend on each other's private helpers.
- **Fix:** Move to `app/deps.py` (or `app/services/resumes.py`) as a public
  dependency.

### 9. `JobSearchResult.source` is dead in practice
**Files:** `app/schemas.py:122`, `app/services/job_search.py:39-52`
- Schema declares `source: str = "jsearch"`; service never sets it.
- Always evaluates to `"jsearch"` today. Frontend's `src/types/index.ts:48` types
  it as non-optional `string` so consumers expect it, but its value is fixed.
- **Fix:** Set `source` from the upstream provider in `_map_listing`, or make
  it optional in both backend and frontend contracts.

### 10. CORS configuration is overly permissive
**File:** `app/main.py:22-28`
- `allow_methods=["*"]` and `allow_headers=["*"]` together with
  `allow_credentials=True`. JWT auth uses Bearer header (no cookies), but
  `allow_credentials=True` still enables cookie cross-origin.
- **Fix:** Restrict methods to `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
  and headers to `["Authorization", "Content-Type"]`. Origin list is already
  environment-driven.

### 11. `passlib==1.7.4` + `bcrypt==3.2.2` is aging
**File:** `requirements.txt:10-11`
- `passlib<1.7.5` emits noisy `__about__` warnings with newer bcrypt.
- `bcrypt==3.2.2` is itself EOL upstream.
- **Fix:** Either drop passlib for direct `bcrypt` usage, or upgrade to
  `passlib==1.7.4` + `bcrypt>=4.0` and silence the upstream warning.

### 12. README/.env.example reference wrong endpoint path
**Files:** `job-tracker-backend/.env.example:12`, `README.md`
- Comment says `POST /ats/score`; the actual endpoint is `POST /resume/ats-score`.
- Same mistake for `/resume/tailor-bullets`.
- **Fix:** Update docs to `POST /resume/ats-score (and /resume/tailor-bullets)`.

### 13. URL validator accepts plaintext `http://` and any host
**File:** `app/schemas.py:58-65, 90-97`
- Permits `http://` (no HTTPS requirement) and doesn't validate well-formedness.
- **Fix:** Use Pydantic's `HttpUrl` or `AnyHttpUrl` (with a documented HTTPS-only
  enforcement at the schema level if desired).

### 14. `req: Request` parameter kept only for slowapi
**File:** `app/routers/jobs.py:62-76`
- The `@limiter.limit("10/minute")` decorator from slowapi requires `Request`
  in the signature. The parameter is never used in the body. Anyone who
  refactors and removes it will break the endpoint.
- **Fix:** Add a comment in the function body explaining the parameter is
  required by slowapi.

### 15. `Job.status_filter` query alias
**File:** `app/routers/jobs.py:30`
- Variable is `status_filter` but query param is `?status=` (via `alias=`).
  Easy to confuse when grepping for `status_filter` in logs or tests.
- **Fix:** Rename variable to `status` (or add a clarifying comment).

### 16. Resume upload reads entire 5MB into memory
**File:** `app/services/resume_parser.py:29-32`, `app/routers/resume.py:39-72`
- `UploadFile.file.read()` buffers the full file. Bounded by the 10/min rate
  limit but not by per-user concurrency.
- **Fix:** Stream chunks to a temp file and feed `pypdf` / `python-docx` from
  disk if you anticipate >10 concurrent uploads.

### 17. `pypdf.extract_text` floor check is not tested
**File:** `app/services/resume_parser.py:106-113`
- "Scanned / image-only PDF" error path is exercised by the user-facing
  message but no test covers `len(text) < _MIN_EXTRACTED_CHARS` (20 chars).
- **Fix:** Add a test with a real text-light PDF (or a synthetic one with
  <20 chars of text).

### 18. Hard-coded test JWT secret + DB password
**File:** `tests/conftest.py:26, 29`
- `JWT_SECRET = "test-secret-key-for-tests-only"` and
  `postgresql://postgres:postgres@localhost:5432/job_tracker_test`.
- Acceptable for a local test suite but the JWT secret is the same every run,
  so test-minted tokens are forgeable if anyone learns the format. The DB
  password matches `.env.example` defaults.
- **Fix:** Generate a random JWT secret per test session. Keep DB password
  gated behind env var with the `postgres` value only as a default.

---

## Recommended Priority
1. **Rotate the live secrets in `.env` (Item 0).**
2. **Fix `docker-compose.yml` Dockerfile / placeholder secret (Items 1, 2).**
3. **Fix the broken `Tailor Bullets` feature (Item 1, Medium).**
4. **Fix `date_applied` frozen default (Item 3, Medium).**
5. **Fix JSearch pagination (Item 4, Medium).**
6. **Increase `enhance_resume` timeout (Item 5, Medium).**
7. **Add DB check to `/health` (Item 2, Medium).**
8. Address Low items as time permits.