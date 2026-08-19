# Job Application Tracker

A job application tracking system with a **FastAPI backend** and **React + TypeScript frontend**.

## Project Structure

```
Job_Tracker/
├── job-tracker-backend/      # FastAPI (Python) — API docs in backend/README.md
└── job-tracker-frontend/     # React 19 + TypeScript + Vite
```

## Frontend

React 19 + TypeScript + Vite SPA for tracking job applications.

### Features
- **Auth**: JWT login/register, protected routes
- **Dashboard** (`/dashboard`): Kanban board with drag-and-drop (Applied → Interviewing → Offer → Rejected)
- **List View** (`/jobs`): Filterable, paginated list with inline editing
- **Job Search**: External job board search (JSearch API) with one-click "Track Job"
- **Live Wallpaper**: Full-screen video background
- **Dark/Light Mode**: System-aware, persisted
- **Accessibility**: Keyboard nav, ARIA, skip links, focus management

### Tech Stack
React 19, TypeScript, Vite 8, React Router 7, Axios, @dnd-kit, date-fns, CSS Variables

### Quick Start
```bash
cd job-tracker-frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # Production build
```

### Environment
Create `.env` from `.env.example`:
```env
VITE_API_URL=http://localhost:8000
```

### Documentation
All docs in `job-tracker-frontend/`:
- `HANDOVER.md` — Quick start, commands, architecture summary
- `ARCHITECTURE.md` — System architecture, data flow, API layer
- `FLOW.md` — User flows (auth, CRUD, drag-drop, search)
- `DECISIONS.md` — Architecture decisions with rationale
- `CONSTRAINTS.md` — API contracts, error formats, boundaries
- `TEST_CHECKLIST.md` — 250+ manual test cases
- `ROLLBACK.md` — Rollback procedures
- `SECURITY_REVIEW.md` — Security audit findings

## Backend

See `job-tracker-backend/README.md` for API docs, database setup, and deployment.