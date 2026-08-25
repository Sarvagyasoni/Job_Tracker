# Job Application Tracker — Frontend

A React + TypeScript + Vite frontend for the Job Application Tracker. Communicates with the existing FastAPI backend via REST API.

## Quick Start

```bash
cd job-tracker-frontend
npm install
npm run dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite) |
| `npm run build` | Production build (TypeScript + Vite) |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

## Environment Variables

Create `.env` from `.env.example`:

```
VITE_API_URL=http://localhost:8000
```

## Features

- **Authentication**: Login, registration, JWT token management, protected routes
- **Password Visibility Toggle**: Show/hide password on auth forms
- **Dashboard**: Kanban board with 4 status columns (Applied, Interviewing, Offer, Rejected)
- **Drag & Drop**: Move applications between status columns
- **Job CRUD**: Create, view, edit, delete applications
- **Job Search**: Search external job boards, track discovered jobs
- **Responsive**: Desktop (horizontal kanban), tablet/mobile (vertical stack)
- **Dark Mode**: System preference detection, persisted toggle
- **Accessibility**: Keyboard navigation, focus management, ARIA labels, skip links
- **Toasts**: Success/error/info/warning notifications with auto-dismiss
- **Frosted Glass UI**: Modern glassmorphism inputs with backdrop blur on auth pages

## Tech Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Frosted Glass UI**: `backdrop-filter` for glassmorphism auth forms
- **React Router 7** for routing
- **Axios** for API communication
- **@dnd-kit** for drag-and-drop
- **date-fns** for date formatting
- **CSS Variables** for theming (no CSS-in-JS)
- **Oxlint** for fast linting

## Architecture

```
src/
├── api/           # Axios instance + typed endpoints
├── auth/          # AuthContext + useAuth hook
├── components/
│   ├── common/    # Button, Input, Select, Modal, Toast, etc.
│   ├── jobs/      # JobCard, JobForm, KanbanBoard, JobSearch
│   └── layout/    # Header, Footer, Layout
├── hooks/         # useAuth, useJobs, useForm, useJobSearch
├── pages/         # Login, Register, Dashboard
├── types/         # TypeScript interfaces (mirrors backend)
└── index.css      # Design system + print styles
```

## Backend Contract

The frontend uses the existing FastAPI backend as the source of truth. See `job-tracker-backend/README.md` for API details.

- **Base URL**: `http://localhost:8000` (configurable via `VITE_API_URL`)
- **Auth**: JWT Bearer tokens, 60 min expiry
- **Endpoints**: `/auth/register`, `/auth/login`, `/jobs` (CRUD), `/jobs/search`

## Security Notes

- JWT stored in localStorage (backend change needed for httpOnly cookie)
- No secrets in frontend source
- All user content safely rendered (React auto-escapes)
- Dependency scan: 0 vulnerabilities

## Production Deployment

```bash
# Build
npm run build

# Set production API URL
VITE_API_URL=https://api.yourdomain.com
```

Configure backend:
- CORS for production frontend domain
- HTTPS + HSTS
- Security headers (CSP, X-Frame-Options, etc.)
- Consider httpOnly cookie for JWT (requires backend change)