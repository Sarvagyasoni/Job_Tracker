# Job Application Tracker — System Architecture

## 1. System Overview

**Job Tracker** is a full-stack application for tracking job applications with AI-assisted resume features.

- **Frontend**: React 19 + TypeScript + Vite, React Router v7, dnd-kit for Kanban
- **Backend**: FastAPI 0.115 + Python 3.12, SQLAlchemy 2.0 + Alembic
- **Database**: PostgreSQL 15
- **External APIs**: OpenWeb Ninja JSearch (job search), Google Gemini (ATS scoring, bullet tailoring)
- **Auth**: JWT (HS256) + bcrypt, stored in localStorage, 60-minute expiry
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

- Frontend dev server proxies `/auth`, `/jobs`, `/resume`, `/health` → `http://localhost:8000`
- Backend serves REST API only; no SSR, no template rendering
- All external calls made from backend (server-side secrets)

---

## 3. Frontend Architecture

### Structure
```
src/
├── api/                          # HTTP LAYER
│   ├── axiosInstance.ts          # Axios config + interceptors (auth, errors)
│   └── endpoints.ts              # Typed API functions (authApi, jobsApi, resumeApi)
├── auth/                         # AUTH STATE
│   ├── AuthContext.tsx           # React Context provider
│   ├── AuthContextType.ts        # TypeScript interface
│   ├── useAuth.ts                # Hook to consume context
│   └── useAuth.test.tsx          # Tests
├── components/                   # UI COMPONENTS (feature-organized)
│   ├── common/                   # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx             # Portal-rendered, focus-trapped
│   │   ├── Toast.tsx             # Custom toast system (no library)
│   │   ├── ProtectedRoute.tsx    # Auth guard
│   │   └── PublicRoute.tsx       # Guest-only guard
│   ├── layout/                   # Page chrome
│   │   ├── Layout.tsx            # Wrapper with Header/Footer
│   │   ├── Header.tsx            # Nav, user menu, theme toggle
│   │   └── ScrollToTop.tsx       # Scroll restoration on route change
│   └── jobs/                     # Job-specific components
│       ├── KanbanBoard.tsx       # DnD context provider
│       ├── KanbanColumn.tsx      # Single column + cards
│       ├── JobCard.tsx           # Draggable card
│       ├── JobForm.tsx           # Create/edit modal
│       ├── JobSearch.tsx         # External search modal
│       └── ResumeManager.tsx     # Upload + AI features
├── hooks/                        # STATE LOGIC (custom hooks = "containers")
│   ├── useJobs.ts                # Jobs CRUD + optimistic updates
│   ├── useJobSearch.ts           # External search + pagination
│   ├── useResume.ts              # Resume + AI features
│   ├── useForm.ts                # Shared form logic
│   └── useToast.ts               # Toast actions
├── pages/                        # ROUTE-LEVEL COMPONENTS
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx             # Kanban + Resume tabs
│   └── JobsList.tsx              # Alternative table view
├── types/                        # TYPESCRIPT INTERFACES
│   └── index.ts                  # Mirrors your Pydantic schemas exactly
├── App.tsx                       # Router + providers + guards
├── main.tsx                      # Entry point (React 18 createRoot)
└── index.css                     # Design tokens (CSS variables) + globals
```

### Key Patterns
- **AuthContext**: Global auth state, JWT in localStorage, client-side token decode (no signature verification), auto-login on mount
- **Axios interceptors**: Attach Bearer token, normalize errors (400→fieldErrors, 401→logout redirect, 429/5xx→user messages)
- **Custom hooks**: `useJobs`/`useResume` encapsulate server state + optimistic updates
- **Routing**: `/login`, `/register` (public); `/dashboard` (Kanban + Resume tabs), `/jobs` (list) under `ProtectedRoute`
- **Profile Gate**: `ProfileGate` wraps protected layout; forces `/onboarding` until profile complete
- **Feature Flags**: `FEATURES.profile` in `src/config/features.ts` kills entire profile feature at runtime
- **Styling**: CSS Modules + CSS variables, mobile-first, frosted-glass auth forms, video background on Layout

---

## 4. Backend Architecture

### Module Layout
```
app/
├── main.py           # FastAPI app, CORS, rate limiter, router registration, validation handler
├── database.py       # Pydantic Settings (.env), SQLAlchemy engine/session, Base
├── models.py         # SQLAlchemy ORM: User, Job, Resume (User has profile fields)
├── schemas.py        # Pydantic request/response models (incl. UserProfile, UserProfileUpdate)
├── auth.py           # bcrypt hashing, JWT create/verify, get_current_user dependency
├── rate_limit.py     # Shared slowapi Limiter (IP-based)
├── routers/
│   ├── auth.py       # POST /register, POST /login (5/min)
│   ├── jobs.py       # CRUD + GET /search (JSearch) + GET /suggested (preferences or resume)
│   ├── profile.py    # GET/PUT /users/me/profile (upsert)
│   └── resume.py     # Upload/GET/DELETE, POST /ats-score, POST /tailor-bullets (10/min)
└── services/
    ├── job_search.py      # JSearch client (httpx async)
    ├── resume_parser.py   # PDF (pypdf) + DOCX (python-docx) extraction, magic-byte validation
    └── llm_client.py      # Gemini client, structured output via response_schema
```

### Design Principles
- **Router → Service → DB** separation; routers thin, services testable without DB/server
- **Ownership enforcement**: `_get_owned_job_or_404` returns 404 (not 403) to prevent enumeration
- **Single resume per user**: `resumes.user_id` unique, upsert on upload, only `extracted_text` stored
- **Structured LLM output**: Gemini `response_schema` enforces JSON matching Pydantic models
- **Validation normalization**: 422 → 400 with field-level errors
- **Profile on user table**: Profile fields stored directly on `users` (1:1, no join needed), nullable for backward compatibility

---

## 5. Database Architecture

### Schema
```sql
users
  id (PK), email (unique), hashed_password, created_at
  + Profile columns: first_name, last_name, preferred_roles, preferred_locations,
    work_mode, employment_type, experience_level, years_of_experience, skills,
    minimum_salary_amount, minimum_salary_currency, profile_updated_at

jobs
  id (PK), user_id (FK→users, cascade), company, role, status (ENUM), date_applied, link, notes, created_at, updated_at
  indexes: user_id, status

resumes
  id (PK), user_id (FK→users, cascade, unique), original_filename, extracted_text, uploaded_at
  index: user_id (unique)
```

### Migrations (Alembic)
1. `43be7473c021` — users + jobs tables, ENUM `job_status`
2. `fadee6b7c0ef` — index on `jobs.status`
3. `484c0d7874e1` — resumes table
4. `a1b2c3d4e5f6` — 12 profile columns on users table (nullable)

### Connection
- `DATABASE_URL` from `.env` → SQLAlchemy engine with `pool_pre_ping=True`
- `SessionLocal` per-request via `get_db` dependency

---

## 6. Frontend ↔ Backend Communication

| Frontend Call | Backend Endpoint | Auth | Notes |
|---------------|------------------|------|-------|
| `authApi.register` | `POST /auth/register` | — | Rate limited 5/min |
| `authApi.login` | `POST /auth/login` | — | Returns JWT, rate limited 5/min |
| `jobsApi.list` | `GET /jobs` | Bearer | Optional `?status=` filter |
| `jobsApi.get` | `GET /jobs/:id` | Bearer | 404 if not owner |
| `jobsApi.create` | `POST /jobs` | Bearer | |
| `jobsApi.update` | `PUT /jobs/:id` | Bearer | Partial update (PATCH-like) |
| `jobsApi.delete` | `DELETE /jobs/:id` | Bearer | |
| `jobsApi.search` | `GET /jobs/search` | Bearer | Proxies JSearch, requires `JSEARCH_API_KEY` |
| `jobsApi.suggested` | `GET /jobs/suggested` | Bearer | `use_preferences` param, requires resume or profile |
| `profileApi.get` | `GET /users/me/profile` | Bearer | 404 if no profile |
| `profileApi.update` | `PUT /users/me/profile` | Bearer | Upsert, partial updates |
| `resumeApi.upload` | `POST /resume` | Bearer | multipart/form-data, 5MB limit |
| `resumeApi.get` | `GET /resume` | Bearer | 404 if none |
| `resumeApi.delete` | `DELETE /resume` | Bearer | |
| `resumeApi.atsScore` | `POST /resume/ats-score` | Bearer | Requires resume + `GEMINI_API_KEY`, 10/min |
| `resumeApi.tailorBullets` | `POST /resume/tailor-bullets` | Bearer | Requires resume + `GEMINI_API_KEY`, 10/min |

- Axios `baseURL: ''` — relies on Vite proxy in dev
- 401 on any protected route → clear localStorage → redirect `/login`

---

## 7. Authentication & Authorization

### Flow
1. **Register**: `POST /auth/register` → bcrypt hash → insert user → return `UserOut`
2. **Login**: `POST /auth/login` → verify bcrypt → `create_access_token(sub=str(user.id), exp=60min)` → return `Token`
3. **Frontend**: Stores `access_token` + `user_email` in localStorage
4. **Subsequent requests**: Axios interceptor adds `Authorization: Bearer <token>`
5. **Backend**: `get_current_user` dependency decodes JWT (verifies signature), loads User from DB
6. **App init**: `AuthProvider` reads localStorage, decodes JWT client-side (no verification), hydrates user

### Gaps
- No token refresh mechanism; hard 60-minute expiry
- Client-side JWT decode trusts localStorage without signature verification
- No refresh tokens, no logout-all-devices
- Rate limiting by IP only (`slowapi` default), no per-user limits

---

## 8. External Services

| Service | Purpose | Endpoint | Auth | Config |
|---------|---------|----------|------|--------|
| **OpenWeb Ninja JSearch** | Live job search | `GET https://api.openwebninja.com/jsearch/search-v2` | `x-api-key` header | `JSEARCH_API_KEY` (optional) |
| **Google Gemini** | ATS scoring, bullet tailoring | `google-genai` SDK (REST) | `GEMINI_API_KEY` | `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash` (optional) |

- Both optional — backend starts without them; endpoints return 500 with actionable message if key missing
- JSearch: cursor pagination documented but not implemented; single-page fetch only
- Gemini: structured output via `response_schema` (Pydantic → JSON Schema), 15s timeout, 15k/8k char limits on resume/JD

---

## 9. Known Architectural Issues

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | No token refresh; 60-min hard expiry | `auth.py`, `AuthContext.tsx` | High |
| 2 | Client-side JWT decode without verification | `AuthContext.tsx:17-25` | Medium |
| 3 | Job search pagination incomplete (cursor not wired) | `job_search.py:61-64` | Medium |
| 4 | Duplicate logic: Dashboard.tsx ≈ JobsList.tsx (~80%) | `pages/Dashboard.tsx`, `pages/JobsList.tsx` | Medium |
| 5 | No API versioning | All routers at root paths | Low |
| 6 | Single resume per user (no history/versioning) | `models.py:36`, `resume.py:48-55` | Medium |
| 7 | No structured logging / observability | — | Medium |
| 8 | Rate limiting by IP only (bypassable behind proxies) | `rate_limit.py:12` | Medium |
| 9 | AI prompts hardcoded, not configurable | `llm_client.py:102-151` | Low |
| 10 | Frontend `VITE_API_URL` defined but unused | `.env.example`, `axiosInstance.ts:5` | Low |
| 11 | `alembic.ini` has placeholder `sqlalchemy.url` | `alembic.ini:63` | Low |
| 12 | No production Dockerfile for frontend | — | Low |
| 13 | Tailor Bullets broken: `response_schema=list[str]` (bare type) | `llm_client.py:154` | **High** |