# Job Application Tracker — Constraints & Boundaries

## Backend Constraints (DO NOT MODIFY)
- **API contracts are fixed** — schemas in `job-tracker-backend/app/schemas.py` are source of truth
- **Endpoints cannot be added/changed** without explicit approval
- **Authentication flow** — JWT Bearer tokens, 60-min expiry, no refresh token endpoint
- **Rate limits** — 5 requests/minute on `/auth/register` and `/auth/login`
- **CORS** — Only configured origins allowed (default: `localhost:5173`, `localhost:3000`)
- **Job search** — Requires `JSEARCH_API_KEY` on backend; returns 500 if not configured

## Frontend Constraints
- **No backend modifications** — ever, without explicit approval
- **Bundle size** — Keep under 200kb gzipped (excluding node_modules)
- **Dependencies** — Minimize; each must be justified
- **Browser support** — Modern evergreen browsers (last 2 versions)
- **No SSR** — Client-side only, SPA
- **No backend-for-frontend** — Direct API calls from browser

## API Constraints
| Endpoint | Constraints |
|----------|-------------|
| POST /auth/register | Email unique, password ≥ 8 chars, rate limited |
| POST /auth/login | Rate limited, returns `{access_token, token_type}` |
| GET /jobs | Requires auth, supports `?status=applied\|interviewing\|offer\|rejected` |
| POST /jobs | `company` required, `link` must be valid HTTP(S) URL |
| PUT /jobs/:id | All fields optional, partial updates allowed |
| DELETE /jobs/:id | Returns 204, no body |
| GET /jobs/search | Requires backend API key, not saved automatically |

## Data Constraints
- **JobStatus enum**: `applied`, `interviewing`, `offer`, `rejected` (exact strings)
- **Date format**: ISO 8601 (`YYYY-MM-DD`) for `date_applied`
- **Link validation**: Must start with `http://` or `https://`
- **Company**: Non-empty string, trimmed

## Error Response Format (Backend)
```json
// 400 Validation Error
{ "detail": [{ "loc": ["body", "field"], "msg": "error message", "type": "value_error" }] }

// 401 Unauthorized
{ "detail": "Could not validate credentials" }

// 404 Not Found
{ "detail": "Job not found" }

// 429 Rate Limited
{ "detail": "Rate limit exceeded" }
```

## Frontend Must Handle
- Token expiry (401) → auto-logout + redirect to login
- Rate limit (429) → user-friendly message with retry guidance
- Network errors → offline-friendly messaging
- Validation errors (400) → field-level inline errors
- Empty states (no jobs, no search results)

## Performance Budgets
- Initial JS bundle: < 100kb gzipped
- Time to Interactive: < 3s on 3G
- Lighthouse Performance: > 90

## Accessibility Minimum
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Focus visible outlines
- Semantic HTML landmarks
- Color contrast ratios ≥ 4.5:1
- Skip-to-content link