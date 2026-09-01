# Job_Tracker

A job application tracking system with a FastAPI backend and React + TypeScript frontend.

## Project Structure

```
Job_Tracker/
├── job-tracker-backend/      # FastAPI backend (Python)
└── job-tracker-frontend/     # React + TypeScript + Vite frontend
```

## Frontend

The frontend is a **React 19 + TypeScript + Vite** single-page application built for tracking job applications.

### Key Features
- **Authentication**: JWT-based login/register with protected routes
- **Dashboard** (`/dashboard`): Kanban board with drag-and-drop status changes (Applied → Interviewing → Offer → Rejected)
- **Applications List** (`/jobs`): Filterable, paginated list view with inline editing
- **Job Search** (`/dashboard` → "Discover Jobs"): External job board search via JSearch API, with one-click "Track Job" to save listings
- **Live Wallpaper**: Full-screen video background across all protected routes
- **Dark/Light Mode**: System-aware with manual toggle, persisted in localStorage
- **Accessibility**: Keyboard navigation, ARIA labels, skip links, focus management

### Tech Stack
- **React 19** + **TypeScript** + **Vite 8**
- **React Router 7** for routing
- **Axios** for API communication with interceptors
- **@dnd-kit** for drag-and-drop kanban
- **date-fns** for date formatting
- **CSS Variables** for theming (dark/light mode)

### Project Structure
```
job-tracker-frontend/
├── src/
│   ├── api/              # Axios instance + typed API endpoints
│   ├── auth/             # AuthContext + useAuth hook (JWT management)
│   ├── components/
│   │   ├── common/       # Button, Input, Modal, Toast, ProtectedRoute
│   │   ├── jobs/         # JobCard, JobForm, JobList, KanbanBoard, JobSearch
│   │   └── layout/       # Header, Footer, Layout, ScrollToTop
│   ├── hooks/            # useJobs, useJobSearch, useForm
│   ├── pages/            # Login, Register, Dashboard, JobsList
│   ├── types/            # TypeScript interfaces (mirrors backend schemas)
│   └── index.css         # Design system + print styles
├── public/assets/
│   ├── background/       # Live wallpaper video + poster
│   └── inspire/          # 28 card background images
├── vite.config.ts
└── package.json
```

### Key Documentation
All project documentation is in the root directory:

| File | Purpose |
|------|---------|
| **HANDOVER.md** | Quick start, key commands, architecture summary, constraints |
| **ARCHITECTURE.md** | System architecture, data flow, API layer, state management |
| **FLOW.md** | User flows (auth, CRUD, drag-drop, search, errors) |
| **DECISIONS.md** | 25 architecture decisions with rationale |
| **CONSTRAINTS.md** | Backend/frontend boundaries, API contracts, error formats |
| **TEST_CHECKLIST.md** | 250+ manual test cases (auth, CRUD, drag-drop, search, a11y) |
| **ROLLBACK.md** | Rollback procedures for frontend/backend |
| **SECURITY_REVIEW.md** | Security audit findings and backend-dependent gaps |

### Quick Start
```bash
cd job-tracker-frontend
npm install
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build
```

### Environment Variables
Create `.env` from `.env.example`:
```env
VITE_API_URL=http://localhost:8000
```

### Backend Connection
The frontend expects the FastAPI backend running at `VITE_API_URL` (default `http://localhost:8000`). All API calls are proxied via Vite in dev, and the frontend expects:
- JWT Bearer tokens (60-min expiry)
- CORS configured for `http://localhost:5173`
- Endpoints: `/auth/register`, `/auth/login`, `/jobs`, `/jobs/search`

---

## Backend

See `job-tracker-backend/README.md` for API documentation, database setup, and deployment instructions.

## Development with Docker

```bash
# Start all services (creates both job_tracker and job_tracker_test databases)
docker-compose up -d

# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

The test database (`job_tracker_test`) is automatically created via `init-db.sh` on first container startup. To reset: `docker-compose down -v && docker-compose up -d`.