# Job Tracker — Architecture & Flow Explanation

## 1. Project Overview

**Job Tracker** is a full-stack job application tracking system with:
- **Frontend**: React 19 + TypeScript + Vite (SPA)
- **Backend**: FastAPI + Python 3.12, SQLAlchemy 2.0 + Alembic
- **Database**: PostgreSQL 15
- **External APIs**: OpenWeb Ninja JSearch (job search), Google Gemini (AI resume features)
- **Authentication**: JWT (HS256) + bcrypt, 60-minute expiry
- **Deployment**: Docker Compose (dev), GitHub Actions CI

---

## 2. High-Level Architecture

```
┌─────────────────┐      HTTPS/REST       ┌─────────────────┐
│   Frontend      │ ◄──────────────────►  │    Backend      │
│  (React/Vite)   │   Bearer JWT          │   (FastAPI)     │
└─────────────────┘                       └────────┬────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    ▼                              ▼                              ▼
            ┌───────────────┐             ┌─────────────────┐            ┌─────────────────┐
            │  PostgreSQL   │             │  JSearch API    │            │  Google Gemini  │
            │  (Primary DB) │             │  (Job Search)   │            │  (AI Features)  │
            └───────────────┘             └─────────────────┘            └─────────────────┘
```

- Frontend dev server (Vite) proxies `/auth`, `/jobs`, `/resume`, `/health` → `http://localhost:8000`
- Backend serves REST API only; no SSR, no template rendering
- All external calls made from backend (server-side secrets)

---

## 3. Backend Architecture

### 3.1 Module Layout

```
app/
├── main.py           # FastAPI app, CORS, rate limiter, router registration, validation handler
├── database.py       # Pydantic Settings (.env), SQLAlchemy engine/session, Base
├── models.py         # SQLAlchemy ORM: User, Job, Resume
├── schemas.py        # Pydantic request/response models
├── auth.py           # bcrypt hashing, JWT create/verify, get_current_user dependency
├── rate_limit.py     # Shared slowapi Limiter (IP-based)
├── routers/
│   ├── auth.py       # POST /register, POST /login (5/min)
│   ├── jobs.py       # CRUD + GET /search (JSearch)
│   └── resume.py     # Upload/GET/DELETE, POST /ats-score, POST /tailor-bullets (10/min)
└── services/
    ├── job_search.py      # JSearch client (httpx async)
    ├── resume_parser.py   # PDF (pypdf) + DOCX (python-docx) extraction, magic-byte validation
    └── llm_client.py      # Gemini client, structured output via response_schema

alembic/
├── env.py            # Migration configuration
└── versions/         # Migration scripts (3 migrations)

tests/
├── conftest.py       # Pytest fixtures (DB, client, auth)
├── test_auth.py      # Auth endpoint tests
├── test_jobs.py      # Jobs CRUD tests
├── test_job_search.py# JSearch integration tests
└── test_resume.py    # Resume upload + AI tests
```

### 3.2 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Router → Service → DB** | Routers are thin; services are testable without DB/server |
| **Ownership enforcement** | `_get_owned_job_or_404` returns 404 (not 403) to prevent enumeration |
| **Single resume per user** | `resumes.user_id` unique, upsert on upload, only `extracted_text` stored |
| **Structured LLM output** | Gemini `response_schema` enforces JSON matching Pydantic models |
| **Validation normalization** | 422 → 400 with field-level errors |

### 3.3 Database Schema

```sql
users
  id (PK), email (unique), hashed_password, created_at

jobs
  id (PK), user_id (FK→users, cascade), company, role, status (ENUM), date_applied, link, notes, created_at, updated_at
  indexes: user_id, status

resumes
  id (PK), user_id (FK→users, cascade, unique), original_filename, extracted_text, uploaded_at
  index: user_id (unique)
```

### 3.4 Key Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | — | Register user, returns UserOut |
| `/auth/login` | POST | — | Login, returns JWT token |
| `/jobs` | GET | Bearer | List user's jobs (optional `?status=` filter) |
| `/jobs` | POST | Bearer | Create job application |
| `/jobs/{id}` | GET | Bearer | Get single job |
| `/jobs/{id}` | PUT | Bearer | Update job (partial, for drag-drop) |
| `/jobs/{id}` | DELETE | Bearer | Delete job |
| `/jobs/search` | GET | Bearer | External job search via JSearch |
| `/resume` | POST | Bearer | Upload resume (PDF/DOCX, 5MB max) |
| `/resume` | GET | Bearer | Get resume metadata |
| `/resume` | DELETE | Bearer | Delete resume |
| `/resume/ats-score` | POST | Bearer | AI ATS scoring (Gemini) |
| `/resume/tailor-bullets` | POST | Bearer | AI bullet tailoring (Gemini) |
| `/health` | GET | — | Health check for orchestration |

---

## 4. Frontend Architecture

### 4.1 Structure

```
src/
├── api/              # Axios instance + typed endpoints (auth, jobs, resume)
├── auth/             # AuthContext, useAuth, token decode (client-side only)
├── components/
│   ├── common/       # Button, Input, Select, Modal, Toast, ProtectedRoute, PublicRoute
│   ├── layout/       # Header, Footer, Layout, ScrollToTop (video background + particles)
│   └── jobs/         # JobCard, JobForm, JobList, KanbanBoard, JobSearch, ResumeManager
├── hooks/            # useJobs, useJobSearch, useResume, useForm, useToast
├── pages/            # Login, Register, Dashboard, JobsList
├── types/            # TypeScript interfaces mirroring backend Pydantic schemas
├── test/             # Vitest setup + utilities
├── App.tsx           # Router, providers, route guards
├── main.tsx          # Entry point
└── index.css         # Design system + print styles
```

### 4.2 Key Patterns

| Pattern | Implementation |
|---------|----------------|
| **AuthContext** | Global auth state, JWT in localStorage, client-side token decode (no signature verification), auto-login on mount |
| **Axios interceptors** | Attach Bearer token, normalize errors (400→fieldErrors, 401→logout redirect, 429/5xx→user messages) |
| **Custom hooks** | `useJobs`/`useResume` encapsulate server state + optimistic updates |
| **Routing** | `/login`, `/register` (public); `/dashboard` (Kanban + Resume tabs), `/jobs` (list) under `ProtectedRoute` |
| **Styling** | CSS Modules + CSS variables, mobile-first, frosted-glass auth forms, video background on Layout |

---

## 5. Authentication & Authorization Flow

### 5.1 Registration
```
User visits /register
  ↓
Fills email + password (min 8 chars)
  ↓
POST /auth/register
  ↓
Success: 201 + UserOut → Auto-login → Redirect to /dashboard
Error: 400 (email exists) / 422 (validation) → Show inline error
```

### 5.2 Login
```
User visits /login
  ↓
Fills email + password
  ↓
POST /auth/login
  ↓
Success: 200 + Token → Store in localStorage → Redirect to /dashboard
Error: 401 (bad credentials) / 422 (validation) / 429 (rate limit) → Show inline error
```

### 5.3 Session Initialization
```
App loads
  ↓
Check localStorage for token
  ↓
If token exists: call GET /jobs to validate
  ↓
  Success → Set user in context → Show dashboard
  Failure (401) → Clear token → Redirect to /login
```

### 5.4 Token Handling
- **Storage**: localStorage (`access_token`, `user_email`)
- **Transmission**: Axios interceptor adds `Authorization: Bearer <token>`
- **Validation**: Backend `get_current_user` dependency decodes JWT (verifies signature), loads User from DB
- **Client-side**: `AuthProvider` reads localStorage, decodes JWT client-side (no verification), hydrates user

### 5.5 Known Auth Gaps
- No token refresh mechanism; hard 60-minute expiry
- Client-side JWT decode trusts localStorage without signature verification
- No refresh tokens, no logout-all-devices
- Rate limiting by IP only (`slowapi` default), no per-user limits

---

## 6. Core User Flows

### 6.1 Dashboard / Kanban Board
```
User on /dashboard
  ↓
GET /jobs
  ↓
Group jobs by status (applied, interviewing, offer, rejected)
  ↓
Render KanbanBoard with 4 columns
  ↓
User actions:
  - Click "New Application" → Open JobForm modal (create mode)
  - Click "View" on job card → Open JobDetail modal
  - Click "Edit" on job card → Open JobForm modal (edit mode)
  - Click "Delete" on job card → Open confirmation modal
  - Drag job card between columns → PUT /jobs/:id {status}
  - Click "Discover Jobs" → Open JobSearch modal
```

### 6.2 Create Job
```
User clicks "New Application"
  ↓
JobForm opens in modal
  ↓
Fills: company (required), role, status, date_applied, link, notes
  ↓
POST /jobs (submit disabled while pending)
  ↓
Success: 201 + JobOut → Toast "Application created" → Close modal → Kanban updates
Error: 400 (validation) → Field-level inline errors
```

### 6.3 Edit Job
```
User clicks "Edit" on job card or in JobDetail
  ↓
JobForm opens in modal pre-filled with job data
  ↓
User modifies fields
  ↓
PUT /jobs/:id (submit disabled while pending)
  ↓
Success: 200 + JobOut → Toast "Application updated" → Close modal → Kanban updates
Error: 400 (validation) → Field-level inline errors
```

### 6.4 Drag-and-Drop Status Change (Optimistic UI)
```
User drags job card from one column to another
  ↓
Optimistic UI update (card moves immediately)
  ↓
PUT /jobs/:id {status: "new_status"}
  ↓
Success: 200 + JobOut → Toast "Status updated" (optional)
Error: 404 / 401 / network → Toast error → Revert card to original column → Refetch
```

### 6.5 Delete Job
```
User clicks "Delete" on job card
  ↓
Confirmation modal: "Are you sure? This cannot be undone."
  ↓
DELETE /jobs/:id
  ↓
Success: 204 → Toast "Application deleted" → Remove from Kanban
Error: 404 / 401 → Toast error
```

### 6.6 Job Search (External)
```
User clicks "Discover Jobs" on dashboard
  ↓
JobSearch modal opens
  ↓
User enters keywords (e.g., "backend developer in Bangalore")
  ↓
GET /jobs/search?query=...&page=1&remote_only=false
  ↓
Loading skeletons shown
  ↓
Results render as JobSearchResultCard cards:
  - Company, role, location, posted date, source badge
  - Snippet/description
  - "View original posting" link (opens in new tab)
  - "Copy link" button (copies URL to clipboard, shows toast)
  - "Track Job" button
  ↓
User clicks "Track Job" on a result
  ↓
Confirmation modal: "Add 'Role' at 'Company' to your tracked applications?"
  ↓
POST /jobs with pre-filled data (company, role, status=applied, date_applied=today, link, notes with source info)
  ↓
Success: 201 + JobOut → Toast "Job tracked" → Result card shows tracked state
```

### 6.7 Resume & AI Features
```
Upload Resume:
  POST /resume (multipart/form-data, PDF/DOCX, 5MB max)
  ↓
  Backend extracts text (pypdf / python-docx) with magic-byte validation
  ↓
  Stores only extracted_text (not file), upserts (one resume per user)

ATS Score:
  POST /resume/ats-score { job_description }
  ↓
  Backend calls Gemini with structured output (response_schema=ATSScoreResponse)
  ↓
  Returns: match_score (0-100), matched_keywords[], missing_keywords[], summary

Tailor Bullets:
  POST /resume/tailor-bullets { job_description }
  ↓
  Backend calls Gemini with structured output (response_schema=list[str]) — **BUG: bare type, broken**
  ↓
  Returns: 502 "AI provider returned an unreadable response"
  Fix: Create Pydantic wrapper model (see BACKEND_ISSUES_REPORT.md Item 1)
```

---

## 7. Frontend ↔ Backend Communication

### 7.1 API Client (Axios)
- **Base URL**: `''` (relies on Vite proxy in dev)
- **Timeout**: 15 seconds
- **Interceptors**:
  - Request: Attaches `Authorization: Bearer <token>` from localStorage
  - Response: Normalizes all errors to `{ message, fieldErrors?, status }`

### 7.2 Error Normalization (Axios Interceptor)
| Status | Handling |
|--------|----------|
| 400 | Validation errors → fieldErrors map + first error as main message |
| 401 (auth endpoint) | Return backend message (e.g., "Incorrect email or password") |
| 401 (protected route) | Clear localStorage → redirect `/login` |
| 404 | "Resource not found" |
| 429 | "Too many requests. Please wait a moment and try again." |
| 500+ | Backend detail (e.g., "GEMINI_API_KEY is missing") |
| Network | "Network error. Please check your connection." |
| Timeout | "Request timed out" |

### 7.3 Typed API Endpoints
```typescript
// src/api/endpoints.ts
authApi.register(data)     → POST /auth/register
authApi.login(credentials) → POST /auth/login
jobsApi.list(filters?)     → GET /jobs
jobsApi.get(id)            → GET /jobs/:id
jobsApi.create(data)       → POST /jobs
jobsApi.update(id, data)   → PUT /jobs/:id
jobsApi.delete(id)         → DELETE /jobs/:id
jobsApi.search(query, page, remoteOnly) → GET /jobs/search
resumeApi.upload(file)     → POST /resume
resumeApi.get()            → GET /resume
resumeApi.delete()         → DELETE /resume
resumeApi.atsScore(jd)     → POST /resume/ats-score
resumeApi.tailorBullets(jd)→ POST /resume/tailor-bullets
```

---

## 8. State Management

### 8.1 Global State (React Context)
- **AuthContext**: `user`, `token`, `isLoading`, `isAuthenticated`, `login`, `register`, `logout`, `refreshUser`
- **ToastContext**: `toast(type, title, message)`, `dismiss(id)` — portal-rendered to `document.body`

### 8.2 Server State (Custom Hooks)
- **useJobs**: `jobs[]`, `fetchJobs`, `createJob`, `updateJob`, `deleteJob` — optimistic updates for create/update/delete
- **useJobSearch**: `results[]`, `search`, `loadMore`, `clearResults` — pagination with "Load More"
- **useResume**: `resume`, `fetchResume`, `uploadResume`, `deleteResume`, `getATSScore`, `tailorBullets`

### 8.3 Form State
- Controlled components with local `useState`
- Custom `useForm` hook for shared validation/submission logic
- Submit buttons disabled during pending requests (`isLoading`)

---

## 9. External Services Integration

### 9.1 OpenWeb Ninja JSearch
- **Endpoint**: `GET https://api.openwebninja.com/jsearch/search-v2`
- **Auth**: `x-api-key` header (`JSEARCH_API_KEY` in .env)
- **Features**: Keyword search, remote-only filter, pagination via `page` parameter (cursor not implemented)
- **Error handling**: Clear 500 if key missing; 429→502, 401/403→500, timeout→502

### 9.2 Google Gemini
- **SDK**: `google-genai` (REST via SDK)
- **Auth**: `GEMINI_API_KEY` in .env
- **Model**: `gemini-2.5-flash` (configurable via `GEMINI_MODEL`)
- **Structured Output**: `response_schema` tied to Pydantic schemas (ATSScoreResponse, list[str])
- **Limits**: 15s timeout, 15k/8k char limits on resume/JD, 10 req/min rate limit

---

## 10. Key Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | React + TypeScript + Vite | Strong ecosystem, TS catches API mismatches, fast HMR |
| 2 | React Router v6 | Standard, lightweight, nested routes |
| 3 | Context + Custom Hooks (no Redux/React Query) | Small scope, avoids extra deps, simple & testable |
| 4 | Axios over fetch | Interceptors, auto JSON parsing, typed generics, cancel tokens |
| 5 | CSS Variables + CSS Modules | Zero runtime, dark/light mode without JS, small bundle |
| 6 | Controlled components + custom validation | Forms are simple, avoids ~10kb dependency |
| 7 | localStorage for JWT | Bearer token in header, simpler than cookies/CSRF |
| 8 | Normalized error objects | Consistent shape, field errors map to inputs, user-friendly messages |
| 9 | CSS variables + localStorage for theme | No flash, works without JS, simple |
| 10 | Semantic HTML + focus management | WCAG 2.1 AA, better UX for all |
| 11 | Feature-based component structure | Easier to find related files, scales better |
| 12 | @dnd-kit for Kanban | Lightweight (~10kb), accessible, headless, TS-first |
| 13 | Frosted glass auth forms | Modern design, works in both themes |
| 14 | First validation error as main toast | Better UX than generic message |
| 15 | 401 on auth endpoints shows backend message | Prevents confusing redirect on bad credentials |
| 16 | Custom toast system | Zero deps, full control, ~2kb |
| 17 | Kanban primary, list alternative | Matches job tracking mental model |
| 18 | Optimistic UI for drag-drop | Instant feedback, revert on error |
| 19 | Disable submit during loading | Prevents double-submission |
| 20 | Loading skeletons over spinners | Perceived performance, no layout shift |
| 21 | Job search modal (not page) | Keeps context, supplementary action |
| 22 | Search results as cards with inline actions | All info visible, copy-to-clipboard, track job pre-fills POST |
| 23 | "Load More" over infinite scroll | Explicit intent, keyboard-friendly |
| 24 | Native Clipboard API | No dep, visual feedback, graceful fallback |
| 25 | Specific error messages per failure mode | Actionable hints, no raw technical details |

---

## 11. Architecture Style & Tier Classification

### 11.1 System Classification
- **Architecture Style**: Modular Monolith with BFF (Backend-for-Frontend) pattern
- **Tier Model**: 3-Tier (Presentation → Application → Data) + External Services
- **Backend Pattern**: Layered (Router → Service → ORM) with thin controllers
- **Frontend Pattern**: Component-Based + Hooks-as-Containers
- **API Paradigm**: RESTful RPC (resource + action endpoints like `/jobs/search`, `/resume/ats-score`)

### 11.2 Service Boundaries (Domain Modules)
| Domain | Module | Public Interface | Dependencies |
|--------|--------|------------------|--------------|
| Auth | `app/auth.py` | `hash_password`, `create_access_token`, `get_current_user` | DB, Settings |
| Jobs | `app/routers/jobs.py` + `app/services/job_search.py` | CRUD + search | DB, JSearch |
| Resume | `app/routers/resume.py` + `app/services/resume_parser.py` + `app/services/llm_client.py` | Upload, AI features | DB, Files, Gemini |

### 11.3 Cross-Cutting Concerns
| Concern | Implementation | Status |
|---------|----------------|--------|
| Configuration | Pydantic Settings (`.env`) | ✅ Basic |
| Logging | Stdlib `print` / uvicorn default | ⚠️ Needs structured logging |
| Observability | `/health` endpoint only | ❌ No metrics/tracing |
| Caching | None | ❌ Consider Redis |
| Background Jobs | None (sync) | ❌ AI calls block event loop |
| API Versioning | None | ⚠️ Plan for `/v1/` prefix |

### 11.4 Data Flow Patterns
- **Read Path**: Frontend → Axios → Router → Service → DB → Response
- **Write Path**: Same + DB Commit → Optimistic UI Update
- **External API**: Frontend → Backend Proxy → External → Backend Transform → Frontend
- **AI Inference**: Frontend → Backend → Gemini (structured output) → Validated Response

### 11.5 Security Architecture (Defense in Depth)
```
┌────────────────────────────────────────────────────┐
│  NETWORK: CORS (allowlist), HTTPS in prod          │
├────────────────────────────────────────────────────┤
│  TRANSPORT: Bearer JWT in Authorization header     │
├────────────────────────────────────────────────────┤
│  APPLICATION:                                      │
│  - Rate limiting (IP-based, per-endpoint)          │
│  - Input validation (Pydantic on all endpoints)    │
│  - Ownership enforcement (404 not 403)             │
│  - File upload validation (magic bytes, size, type)│
├────────────────────────────────────────────────────┤
│  DATA:                                             │
│  - bcrypt (passlib) for passwords                  │
│  - SQLAlchemy ORM (parameterized queries)          │
│  - JWT HS256 (symmetric, 60-min expiry)            │
├────────────────────────────────────────────────────┤
│  SECRETS: .env (not committed), Docker secrets     │
└────────────────────────────────────────────────────┘
```

### 11.6 Scalability & Evolution Path
| Component | Current | Bottleneck | Mitigation |
|-----------|---------|------------|------------|
| **Database** | Single PG instance | Connection pool exhaustion | PgBouncer, read replicas |
| **Backend** | Single uvicorn worker | CPU-bound AI calls block event loop | Gunicorn + workers, or async AI calls |
| **Rate Limiting** | In-memory (slowapi) | Doesn't work multi-instance | Redis-backed limiter |
| **File Upload** | Local memory | 5MB limit, no streaming | S3 presigned URLs, streaming upload |
| **AI Calls** | Sync, 15s timeout | Blocks request thread | Background job queue (Celery/RQ) |
| **Frontend** | Vite dev server | N/A (static in prod) | CDN + nginx for static assets |

---

## 12. Known Architectural Issues

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | No token refresh; 60-min hard expiry | `auth.py`, `AuthContext.tsx` | High |
| 2 | Client-side JWT decode without verification | `AuthContext.tsx:17-25` | Medium |
| 3 | Job search pagination incomplete (page param used, not cursor) | `job_search.py:61-64` | Medium |
| 4 | Duplicate logic: Dashboard.tsx ≈ JobsList.tsx (~80%) | `pages/Dashboard.tsx`, `pages/JobsList.tsx` | Medium |
| 5 | No API versioning | All routers at root paths | Low |
| 6 | Single resume per user (no history/versioning) | `models.py:36`, `resume.py:48-55` | Medium |
| 7 | No structured logging / observability | — | Medium |
| 8 | Rate limiting by IP only (bypassable behind proxies) | `rate_limit.py:12` | Medium |
| 9 | AI prompts hardcoded, not configurable | `llm_client.py:102-151` | Low |
| 10 | `VITE_API_URL` defined but unused | `.env.example`, `axiosInstance.ts:5` | Low |
| 11 | Sync AI calls block FastAPI event loop | `llm_client.py:52-61` | Medium |
| 12 | In-memory rate limiter doesn't scale horizontally | `rate_limit.py:12` | Medium |

---

## 13. Security Considerations

### Implemented
- bcrypt password hashing (passlib)
- JWT with HS256, 60-min expiry
- Rate limiting on auth (5/min) and AI (10/min) endpoints
- CORS restricted to configured origins
- Ownership enforcement (404 not 403)
- File upload validation (magic bytes, size limit, type check)
- SQLAlchemy ORM (prevents SQL injection)
- Pydantic validation on all inputs

### Gaps (from SECURITY_REVIEW.md)
- No token refresh / rotation
- Client-side JWT decode without signature verification
- No CSRF protection (Bearer tokens mitigate)
- No security headers (HSTS, CSP, etc.)
- Rate limiting by IP only
- No audit logging
- Secrets in .env (not committed)

---

## 14. Deployment

### Development
```bash
# Backend
cd job-tracker-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL, JWT_SECRET
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd job-tracker-frontend
npm install
npm run dev  # http://localhost:5173
```

### Docker Compose
```yaml
# docker-compose.yml (actual)
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: job_tracker
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sh:/docker-entrypoint-initdb.d/init-db.sh  # Creates job_tracker_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./job-tracker-backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/job_tracker
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGINS: "http://localhost:5173,http://localhost:3000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./job-tracker-backend:/app

volumes:
  postgres_data:
```

> **Note**: `init-db.sh` creates `job_tracker_test` database on first startup for backend tests.

> **Note**: Uses PostgreSQL 16 (not 15 as mentioned in Project Overview)

### Production (Render)
- PostgreSQL managed instance
- Web Service with build: `pip install -r requirements.txt`
- Start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_MINUTES=60`

---

## 15. Testing

### Backend (pytest)
```bash
psql -U postgres -c "CREATE DATABASE job_tracker_test;"
pytest -v
```
- Tests use separate database (`job_tracker_test`)
- Each test runs in rolled-back transaction
- Coverage: auth, jobs CRUD, resume, job search, AI features

### Frontend (Vitest)
```bash
cd job-tracker-frontend
npm run test
```
- Component tests for auth, hooks, UI components
- Test setup in `src/test/setup.ts`

---

## 16. Summary

**Job Tracker** is a well-structured full-stack application demonstrating:
- Clean separation of concerns (Router → Service → DB)
- Type-safe API contracts (Pydantic ↔ TypeScript)
- Optimistic UI for responsive interactions
- Accessible, modern React patterns (Context, hooks, dnd-kit)
- AI integration with structured LLM output
- External API integration with graceful degradation
- Comprehensive error handling and user feedback

The codebase is maintainable, documented, and follows modern best practices for both frontend and backend development.