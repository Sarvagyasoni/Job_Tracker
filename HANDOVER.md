# Job Application Tracker — Frontend Handover

## Project Overview
Frontend for the Job Application Tracker built with React + TypeScript + Vite. Communicates with the existing FastAPI backend via REST API.

## Quick Start
```bash
cd job-tracker-frontend
npm install
npm run dev
```

## Key Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

## Architecture Summary
- **API Layer** (`src/api/`): Axios instance with interceptors, typed endpoints
- **Auth** (`src/auth/`): Context + hooks for JWT token management
- **Pages** (`src/pages/`): Route-level components (Login, Register, Dashboard, Applications, Suggestions, Resume)
- **Components** (`src/components/`): Reusable UI components
  - `common/`: Button, Input, Select, Textarea, Card, Modal, Toast, ProtectedRoute, PublicRoute
  - `jobs/`: JobCard, JobForm, JobList, KanbanBoard, KanbanColumn, JobSearch, JobSearchResultCard, SuggestedJobs, ResumeManager
  - `layout/`: Header, Sidebar, Footer, Layout, ScrollToTop
- **Hooks** (`src/hooks/`): Custom React hooks (useAuth, useJobs, useForm, useJobSearch, useResume)
- **Types** (`src/types/`): TypeScript interfaces matching backend schemas
- **Styles** (`src/index.css`): CSS variables for theming (dark/light mode)

## Navigation Structure
The sidebar is the **primary navigation** for all protected routes:

| Sidebar Item | Route | Component |
|--------------|-------|-----------|
| Dashboard | `/dashboard` | `Dashboard` - Stats cards, recent applications |
| Applications | `/applications` | `Applications` - Kanban board for job tracking |
| Suggestions | `/suggestions` | `Suggestions` - AI-powered job recommendations |
| Resume | `/resume` | `Resume` - Resume upload, ATS scoring, bullet tailoring |
| Preferences | `/profile` | `ProfilePage` - Edit job preferences (guarded by `FEATURES.profile`) |

- **Routing**: React Router v6 (`react-router-dom`)
- **Active state**: `NavLink` automatically highlights the current route
- **Mobile**: Sidebar collapses into a slide-out menu (toggled via Header hamburger)
- **Logout**: Uses React Router `navigate('/login')` (not `window.location`)

## Backend Contract (Source of Truth)
- **Base URL**: `http://localhost:8000` (configurable via `VITE_API_URL`)
- **Auth**: JWT Bearer tokens, 60 min expiry
- **Endpoints**: See `ARCHITECTURE.md` for full list

## Environment Variables
Create `.env` from `.env.example`:
```
VITE_API_URL=http://localhost:8000
```

## Known Constraints
- Backend rate limits auth endpoints (5 req/min)
- Job search requires `JSEARCH_API_KEY` on backend (optional feature)
- CORS configured for `localhost:5173` by default

## Phase 2 Features Implemented
- **Kanban Board**: 4 status columns (Applied, Interviewing, Offer, Rejected) with drag-and-drop
- **Drag-and-Drop**: @dnd-kit for status changes, persists via PUT /jobs/:id
- **Job Detail Modal**: View full application details with edit shortcut
- **Confirmation Modal**: Required before destructive delete actions
- **Toast Notifications**: Success/error/info/warning with auto-dismiss and progress bar
- **Loading Skeletons**: Shimmer animations for kanban columns during fetch
- **Empty States**: Illustrated empty states for board and list views
- **Form Validation**: Client-side + server-side error mapping
- **Duplicate Submission Prevention**: Disabled buttons during pending requests
- **Error Handling**: User-friendly messages for 401, 403, 404, validation, network, server errors
- **Responsive Layout**: Desktop (horizontal kanban), tablet/mobile (vertical stack)
- **Dark Mode**: Consistent theming across all components via CSS variables
- **Frosted Glass Auth Forms**: Glassmorphism inputs with backdrop blur, password visibility toggle
- **Improved Error Handling**: First validation error as primary message; auth 401 returns backend message

## Phase 3 Features Implemented
- **Job Search Interface**: Search external job boards via GET /jobs/search
- **Search Form**: Keywords input, remote-only filter, Enter to submit
- **Results Display**: Company, role, location, posting date, source badge, snippet
- **Job Link**: Opens original posting in new tab
- **Copy to Clipboard**: One-click copy job URL with toast feedback
- **Track Job Action**: Saves search result to tracked applications via POST /jobs
- **Confirmation Modal**: Before tracking external job
- **Duplicate Prevention**: Submit disabled while tracking
- **Load More Pagination**: Fetches additional pages
- **Loading Skeletons**: Shimmer cards during search
- **Error Handling**: API timeout, rate limit, missing config, empty results, network errors
- **Accessible**: Keyboard navigation, focus states, ARIA labels, live regions

## Phase 4 Features Implemented (Resume & AI)
- **Resume Upload**: PDF/DOCX upload (5MB max) with magic-byte validation via POST /resume
- **Resume Management**: View filename/upload date, delete resume
- **ATS Score**: Compare resume vs job description via POST /resume/ats-score (Gemini)
- **Tailor Bullets**: Generate 5-8 tailored resume bullets via POST /resume/tailor-bullets (Gemini)
- **Enhance PDF**: Generate a reorganized, job-tailored resume as a downloadable PDF via POST /resume/enhance (Gemini + reportlab)
- **Resume Tabs**: Resume page has "Resume", "ATS Score", "Tailor Bullets", "Enhance PDF" tabs
- **Rate Limited**: AI endpoints limited to 10 req/min

## Phase 5: Navigation Reorganization (2026-09-01)
- **Sidebar = Primary Navigation**: Dashboard, Applications, Suggestions, Resume are now sibling routes navigated via the sidebar
- **Removed Duplicate Tabs**: The old "Applications | Suggestions | Resume" tab group inside the Dashboard has been removed
- **Dashboard is Dashboard-Only**: The Dashboard now contains only summary content (stats cards, recent applications) — no embedded sub-pages
- **React Router Integration**: Sidebar uses `NavLink` for active state tracking; logout uses `useNavigate()` (not `window.location`)
- **Mobile**: Sidebar collapses into a slide-out menu with close button; overlay click dismisses
- **Dead Code Cleanup**: Removed unused `JobsList.tsx` and its CSS module (replaced by the proper `Applications` page)

## Phase 6: Enhanced PDF Resume (2026-09-01)
- **New Tab on Resume Page**: "Enhance PDF" tab alongside the existing Upload/ATS/Tailor tabs
- **AI-Powered Reorganization**: Sends the user's resume + a target job description to `POST /resume/enhance`, which uses Gemini to reorganize the resume into clean sections (Summary, Skills, Experience, Education) tailored to the job
- **PDF Download**: Response is a binary PDF (rendered server-side via reportlab) that the frontend auto-downloads as `enhanced_resume.pdf`
- **Blob Error Handling**: Since the endpoint returns a blob, error responses come back as JSON blobs — the hook detects this by MIME type and surfaces the backend's `detail` message
- **Success State**: Shows a confirmation card with the timestamp of the last successful generation and a hint to check the browser's downloads folder
- **Rate Limited**: 10 req/min (same as other AI endpoints)
- **Requires**: A resume must already be uploaded (backend returns 404 otherwise)

## Phase 7: Profile & Job Preferences (2026-09-02)
- **Full contract**: See `features/profile/README.md` (the single source of truth for this feature)
- **Onboarding**: New users (and existing users without a profile) are forced to `/onboarding` before they can use the app. Two-step form: "About You" + "Job Preferences"
- **Editable preferences**: Sidebar "Preferences" item links to `/profile` (wrapped in standard `Layout`) with the form pre-filled
- **Required fields**: `first_name`, `last_name`, at least one `preferred_role`, at least one `preferred_location`
- **Optional fields**: `work_mode`, `employment_type`, `experience_level`, `years_of_experience`, `skills` (chips), `minimum_salary` (amount + currency, behind a checkbox)
- **Validation**: Client-side mirror of backend rules (25 char / 10 item limits, no duplicates, no empty required arrays)
- **Personalized Suggestions**: `/jobs/suggested` extended with `use_preferences` flag — when true and profile is complete, backend runs cartesian product of roles × locations and dedupes by job link. Suggestions page shows the active roles/locations as a context bar with "Edit Preferences" link, and shows "Set Preferences" CTA when no profile exists
- **Display**: Header and Sidebar show the user's first name when available, falling back to email
- **Force gate**: A `<ProfileGate>` route guard wraps the protected layout. If the profile is incomplete, it redirects to `/onboarding` (with no infinite loop, since `/onboarding` is outside the gate)
- **Feature flag**: `FEATURES.profile` in `src/config/features.ts` — flipping to `false` removes the entire feature (kills the onboarding gate, hides the Preferences nav item, falls back to resume-based suggestions)
- **Isolation**: All new code under `src/features/profile/` (12 new files). Backend changes are one new file (`app/routers/profile.py`) + small surgical edits to `models.py`, `schemas.py`, `main.py`, `routers/jobs.py`, plus one new alembic migration
- **Removal**: See Section 9 of `features/profile/README.md` for step-by-step removal instructions

### Known Issue: Tailor Bullets Currently Broken
- **Bug**: `generate_tailored_bullets()` in `llm_client.py:154` uses `response_schema=list[str]` (bare Python type)
- **Result**: Returns "AI provider returned an unreadable response"
- **Fix**: Requires backend change - create Pydantic wrapper model like `_SearchQuery`
- **Status**: Documented in `BACKEND_ISSUES_REPORT.md` Item 1

## Security Review Summary (2026-08-16)
Full review in `SECURITY_REVIEW.md`

### ✅ Passed
- No API keys/secrets in frontend source or git history
- Server-side authentication authoritative (backend validates JWT)
- All user content safely rendered (React JSX auto-escapes)
- No `dangerouslySetInnerHTML` or unsafe URL handling
- Abuse-resistant forms (rate limiting, disabled submit, password confirmation)
- Dependency scan clean (0 vulnerabilities)

### ⚠️ Known Limitations (Backend-Dependent)
| Issue | Impact | Requires Backend Change |
|-------|--------|------------------------|
| JWT stored in localStorage | Accessible via XSS | Yes - httpOnly cookie |
| Missing security headers (CSP, X-Frame-Options) | Defense in depth | Yes - middleware |
| No refresh token rotation | Token expiry requires re-login | Yes - new endpoint |

### 📋 Production Deployment Checklist
- [ ] Set `VITE_API_URL=https://your-api-domain.com` in production
- [ ] Configure backend CORS for production frontend domain
- [ ] Enable HTTPS on both frontend and API
- [ ] Add security headers on backend (CSP, HSTS, X-Frame-Options)
- [ ] Consider httpOnly cookie for JWT (requires backend change)
- [ ] Set up error monitoring (Sentry, etc.)

## Testing Checklist
See `TEST_CHECKLIST.md` for manual test scenarios (includes security tests).

## Rollback Procedure
See `ROLLBACK.md` for reverting changes.