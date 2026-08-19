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
| `npm run lint` | Run ESLint |

## Architecture Summary
- **API Layer** (`src/api/`): Axios instance with interceptors, typed endpoints
- **Auth** (`src/auth/`): Context + hooks for JWT token management
- **Pages** (`src/pages/`): Route-level components (Login, Register, Dashboard)
- **Components** (`src/components/`): Reusable UI components
  - `common/`: Button, Input, Select, Textarea, Card, Modal, Toast, ProtectedRoute, PublicRoute
  - `jobs/`: JobCard, JobForm, JobList, KanbanBoard, KanbanColumn, JobSearch, JobSearchResultCard
  - `layout/`: Header, Footer, Layout, ScrollToTop
- **Hooks** (`src/hooks/`): Custom React hooks (useAuth, useJobs, useForm, useJobSearch)
- **Types** (`src/types/`): TypeScript interfaces matching backend schemas
- **Styles** (`src/index.css`): CSS variables for theming (dark/light mode)

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