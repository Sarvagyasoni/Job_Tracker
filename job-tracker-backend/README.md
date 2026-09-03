# Job Application Tracker — Backend

A FastAPI backend for tracking job applications. Each user has their own
private, JWT-authenticated list of applications (company, role, status,
dates, notes, etc.).

## Stack

- **FastAPI** + **Uvicorn**
- **PostgreSQL** via **SQLAlchemy** ORM
- **Alembic** for migrations
- **JWT** auth (`python-jose`) + **bcrypt** password hashing (`passlib`)
- **pytest** + **httpx** for tests

## Project structure

```
app/
  main.py            FastAPI app, router wiring, error handling
  models.py           SQLAlchemy models: User (with profile fields), Job, Resume, JobStatus enum
  schemas.py          Pydantic request/response schemas (incl. UserProfile, UserProfileUpdate)
  database.py          Engine/session setup, settings (.env)
  auth.py               Password hashing, JWT, get_current_user dependency
  routers/
    auth.py             /auth/register, /auth/login
    jobs.py               /jobs CRUD endpoints + /jobs/suggested
    profile.py           /users/me/profile (GET/PUT)
alembic/               Migration environment + versions/
tests/                 pytest suite
requirements.txt
.env.example
```

## API overview

**Auth**
- `POST /auth/register` — `{ "email", "password" }` → creates a user
- `POST /auth/login` — `{ "email", "password" }` → `{ "access_token", "token_type" }`

Both are rate-limited to 5 requests/minute per IP to slow down brute-force
credential guessing. Exceeding it returns `429 Too Many Requests`.

All routes below require `Authorization: Bearer <token>`.

**Jobs** (always scoped to the authenticated user)
- `GET /jobs` — list your jobs, optional `?status=applied|interviewing|offer|rejected`
- `GET /jobs/{id}`
- `POST /jobs` — `{ "company" (required), "role", "status", "date_applied", "link", "notes" }`
- `PUT /jobs/{id}` — update any subset of fields (e.g. just `{"status": "offer"}` for drag-and-drop status changes)
- `DELETE /jobs/{id}`
- `GET /jobs/search?query=...&page=1&remote_only=false` — live search against
  an external job board (JSearch by OpenWeb Ninja). Results are **not** saved
  automatically — pass a result's `company`/`role`/`link`/`notes` fields into
  `POST /jobs` to add it to your tracked list. Requires `JSEARCH_API_KEY` to be
  set (see below); returns a clear 500 error if it isn't configured.
- `GET /jobs/suggested?page=1&use_preferences=true` — like `/jobs/search`, but you
  don't provide a query yourself. When `use_preferences=true` (default) and the
  user has a complete profile, the backend runs a cartesian product of
  `preferred_roles × preferred_locations` via JSearch, deduplicates by job link,
  and returns combined results. When `use_preferences=false` or no profile exists,
  falls back to resume-based query generation via Gemini. Requires either a
  complete profile or a saved resume (404 if neither), plus `GEMINI_API_KEY`
  and `JSEARCH_API_KEY`.

**Profile**
- `GET /users/me/profile` — returns the user's profile (first_name, last_name,
  preferred_roles, preferred_locations, work_mode, employment_type,
  experience_level, years_of_experience, skills, minimum_salary, is_complete).
  Returns 404 if no profile has been created yet.
- `PUT /users/me/profile` — creates or updates the user's profile (upsert).
  Accepts partial updates. Required fields: first_name, last_name,
  preferred_roles (min 1), preferred_locations (min 1). Returns the full
  profile with server-computed `is_complete` flag.

**Resume & AI features** (always scoped to the authenticated user)
- `POST /resume` — upload a resume (PDF or DOCX, 5MB max) as `multipart/form-data`
  with a `file` field. Only the extracted text is stored, not the file itself.
  Uploading again replaces your existing resume (one per user).
- `GET /resume` — see your saved resume's filename and upload date
- `DELETE /resume`
- `POST /resume/ats-score` — `{ "job_description" }` → compares your saved
  resume against the job description using Gemini, returning a 0-100 match
  score, matched/missing keywords, and a short summary. Requires a resume to
  already be uploaded (404 if not).
- `POST /resume/tailor-bullets` — `{ "job_description" }` → generates 5-8
  resume bullet points from your saved resume, tailored to highlight skills
  relevant to the job description, without inventing new experience. Requires
  a resume to already be uploaded (404 if not) — same as ATS scoring.
- `POST /resume/enhance` — `{ "job_description" }` → reorganizes your saved
  resume into sections (Summary, Skills, Experience, etc.) tailored to the
  job description, and returns it as a downloadable PDF
  (`Content-Type: application/pdf`). Grounded strictly in your original
  resume's content — doesn't invent companies, titles, dates, or metrics.
  Requires a resume to already be uploaded (404 if not).

All three AI endpoints are rate-limited to 10 requests/minute per IP, and
require `GEMINI_API_KEY` to be set (see below); return a clear 500 if it isn't.

Errors: `401` for missing/invalid auth, `404` for a job that doesn't exist
or belongs to another user, `400` for invalid input (missing `company`,
bad `status`, bad date format, etc.).

Interactive API docs are available at `/docs` (Swagger UI) once the server
is running.

## Local setup

### 1. Prerequisites

- Python 3.11+
- A local PostgreSQL instance (or Docker: `docker run --name jt-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`)

### 2. Install dependencies

```bash
python3 -m venv venv
source venv/bin/activate         # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/job_tracker
JWT_SECRET=<generate something long and random>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

Generate a decent secret with:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3a. (Optional) Enable job search

`GET /jobs/search` needs a free JSearch API key from OpenWeb Ninja:

1. Go to [openwebninja.com/api/jsearch](https://www.openwebninja.com/api/jsearch) and sign up (free)
2. Subscribe to the free tier (no credit card required)
3. Copy your API key from the docs page (`x-api-key` value)
4. Set `JSEARCH_API_KEY=...` in your `.env`

If you skip this, the rest of the app works fine — `GET /jobs/search` will
just return a clear `500` explaining the key is missing, until you add it.

### 3a-2. (Optional) Enable ATS scoring and bullet tailoring

`POST /resume/ats-score` and `POST /resume/tailor-bullets` need a Gemini
API key:

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and sign in with a Google account
2. Create an API key
3. Set `GEMINI_API_KEY=...` in your `.env`

`GEMINI_MODEL` defaults to `gemini-2.5-flash` — change it in `.env` if
you want a different model. If you skip the key, both endpoints return a
clear `500` explaining what's missing, same as job search.

### 3b. Frontend access (CORS)

By default, only `http://localhost:5173` (Vite) and `http://localhost:3000`
(Create React App) can call this API from a browser. If your teammate's
frontend runs somewhere else, add it to `CORS_ORIGINS` in `.env` as a
comma-separated list:

```
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080
```

Once you deploy the frontend somewhere real, add that URL too (comma-
separated alongside the local ones, or replace them entirely for a
production-only deploy). If a frontend gets a CORS error in the browser
console, this is almost always the fix.

### 4. Create the database

```bash
psql -U postgres -c "CREATE DATABASE job_tracker;"
```

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Start the server

```bash
uvicorn app.main:app --reload
```

The API is now at `http://127.0.0.1:8000`, docs at `http://127.0.0.1:8000/docs`.

### 7. Try it out

```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "a-strong-password"}'

curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "a-strong-password"}'
# -> { "access_token": "...", "token_type": "bearer" }

curl -X POST http://127.0.0.1:8000/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"company": "Acme Corp", "role": "Backend Engineer"}'
```

## Running tests

Tests run against a **separate** database (`job_tracker_test` by default,
derived automatically from `DATABASE_URL`) so they never touch your dev
data. Each test runs inside a rolled-back transaction, so the schema only
needs to be created once per test session and tests never leak state into
one another.

```bash
psql -U postgres -c "CREATE DATABASE job_tracker_test;"
pytest -v
```

If you'd rather point at a different test database explicitly, set
`TEST_DATABASE_URL` before running pytest.

## Migrations

To generate a new migration after changing `app/models.py`:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

**Note on enum columns:** if you ever add/remove a Postgres `ENUM` type
(like `JobStatus`), double-check the autogenerated `downgrade()`. Alembic's
autogenerate drops the *table* that uses the enum but does not drop the
enum *type* itself, which will break a downgrade → upgrade cycle with
`type "..." already exists`. Add an explicit
`sa.Enum(name='...').drop(op.get_bind(), checkfirst=True)` at the end of
`downgrade()` when that happens (already done in the initial migration).

## Deploying to Render

1. **Create a PostgreSQL instance** on Render (Dashboard → New → PostgreSQL).
   Copy its **Internal Database URL** once it's provisioned.

2. **Create a Web Service**, pointing at this repo.

3. **Environment variables** (Web Service → Environment):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Postgres instance's Internal Database URL |
   | `JWT_SECRET` | a long random string (generate as above — don't reuse the local one) |
   | `JWT_ALGORITHM` | `HS256` |
   | `JWT_EXPIRE_MINUTES` | `60` (or your preference) |

4. **Build command:**

   ```bash
   pip install -r requirements.txt
   ```

5. **Start command** — run migrations, then start the server. Render sets
   `$PORT` for you, so bind to it:

   ```bash
   alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

6. Deploy. Once it's live, hit `https://<your-service>.onrender.com/health`
   to confirm it's up, and `/docs` for the interactive API docs.

**Notes:**
- Render's free-tier Postgres instances can idle-timeout connections; the
  app uses `pool_pre_ping=True` (in `app/database.py`) so stale connections
  are detected and refreshed automatically rather than surfacing as 500s.
- If you rotate `JWT_SECRET`, every previously issued token becomes invalid
  — users will need to log in again.