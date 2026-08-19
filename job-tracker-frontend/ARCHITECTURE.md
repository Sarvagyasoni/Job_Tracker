# Job Application Tracker — Frontend Architecture

## High-Level Structure
```
src/
├── api/              # Axios instance + typed API endpoints
├── auth/             # AuthContext, useAuth hook, token storage
├── components/
│   ├── common/       # Reusable UI (Button, Input, Modal, etc.)
│   ├── layout/       # Header, Nav, Footer, MobileMenu
│   └── jobs/         # Job-specific components (JobCard, JobForm, JobList)
├── hooks/            # Custom hooks (useAuth, useJobs, useDebounce, etc.)
├── pages/            # Route-level components
├── styles/           # Global CSS, CSS variables, theme
├── types/            # TypeScript interfaces (mirror backend schemas)
└── utils/            # Helpers (error parsing, date formatting, validation)
```

## UI Design System
- **Frosted Glass Inputs**: Auth forms use glassmorphism with `backdrop-filter: blur(20px)`, semi-transparent backgrounds, and layered shadows
- **Password Toggle**: Input component supports show/hide password with icon button
- **Responsive Cards**: Auth card scales from square (mobile) to 4:3 (tablet) to larger square (desktop)

## Data Flow
```
User Action → Component → Hook → API Layer → Backend
                    ↓
              State Update → Re-render
```

## API Layer (`src/api/`)
- **axiosInstance**: Configured with baseURL, interceptors for auth headers, error normalization
- **endpoints.ts**: Typed functions for each backend endpoint
- **Error handling**: Normalizes backend errors to consistent format
  - 400: Uses first validation error as main message, maps field errors
  - 401: On auth endpoints returns backend message; on protected routes clears token and redirects
  - 404/403/429/500: User-friendly messages with status codes
  - Network/timeout: Offline-friendly messaging

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login, returns JWT |
| GET | /jobs | List user's jobs (optional ?status=) |
| GET | /jobs/:id | Get single job |
| POST | /jobs | Create job |
| PUT | /jobs/:id | Update job (partial) |
| DELETE | /jobs/:id | Delete job |
| GET | /jobs/search | External job search (optional) |

## Authentication (`src/auth/`)
- **AuthContext**: Provides `user`, `token`, `login`, `register`, `logout`, `isLoading`
- **Token storage**: localStorage (persists across refresh)
- **Auto-refresh**: Token validated on app init via `/jobs` call
- **Protected routes**: Wrapper component redirects unauthenticated users

## State Management
- **React Context** for auth (global, low-frequency updates)
- **React Query / SWR** not used — custom hooks with useState/useEffect for simplicity
- **Local component state** for forms, UI toggles

## Styling Approach
- **CSS Variables** for theming (dark/light mode)
- **CSS Modules** or plain CSS for component-scoped styles
- **No CSS-in-JS** or heavy frameworks (keep bundle small)
- **Mobile-first responsive** design

## Accessibility
- Semantic HTML
- ARIA labels where needed
- Focus visible outlines
- Skip-to-content link
- Keyboard navigable
- Color contrast (WCAG AA)

## Type Safety
- Types in `src/types/` mirror backend Pydantic schemas
- API functions return typed promises
- No `any` — use `unknown` + type guards