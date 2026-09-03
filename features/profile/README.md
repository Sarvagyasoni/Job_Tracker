# Profile & Job Preferences Feature

## Status

- [x] **Proposed** — README drafted, awaiting team review
- [x] Frontend implemented
- [x] Backend implemented
- [x] End-to-end tested (build passes, lint clean, 4 tests pass, login verified)
- [x] Rolled out (feature flag on, DB migration applied)
- [ ] Deprecated

**Last updated:** 2026-09-02
**Owner:** Frontend team (this file is shared between frontend and backend)

---

## 1. Overview

A user profile + job preferences system that:

1. Collects personal info (name) and job-search preferences (roles, locations, work mode, etc.) when a user first registers
2. Forces completion of the required fields before the user can access the rest of the app
3. Lets the user edit their preferences later from a "Preferences" page in the sidebar
4. Powers the **Suggestions** page to show personalized job recommendations based on the saved preferences

### Required fields (cannot be empty)

- `first_name` (string)
- `last_name` (string)
- `preferred_roles` (at least 1 item)
- `preferred_locations` (at least 1 item)

### Optional fields

- `work_mode` (multi-select: `remote`, `hybrid`, `on_site`, `any`)
- `employment_type` (multi-select: `full_time`, `part_time`, `contract`, `internship`, `freelance`, `any`)
- `experience_level` (single-select: `internship`, `entry_level`, `junior`, `mid`, `senior`, `lead`, `any`)
- `years_of_experience` (single-select: `0`, `1-2`, `3-5`, `6-10`, `10+`, `any`)
- `skills` (array of strings, chips input)
- `minimum_salary` (integer + currency)

### Match scores

**Out of scope for v1.** Suggestions will list relevant jobs without a percentage/strength indicator. Can be added in a follow-up.

---

## 2. Frontend Type Contract (Source of Truth)

This is what the frontend will use. Backend must return data matching these shapes.

```ts
// File: job-tracker-frontend/src/features/profile/types.ts

export type WorkMode = 'remote' | 'hybrid' | 'on_site' | 'any';
export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'freelance'
  | 'any';
export type ExperienceLevel =
  | 'internship'
  | 'entry_level'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'any';
export type YearsOfExperience = '0' | '1-2' | '3-5' | '6-10' | '10+' | 'any';

export interface UserProfile {
  first_name: string;
  last_name: string;
  preferred_roles: string[];
  preferred_locations: string[];
  work_mode: WorkMode[];
  employment_type: EmploymentType[];
  experience_level: ExperienceLevel;
  years_of_experience: YearsOfExperience;
  skills: string[];
  minimum_salary: {
    amount: number;
    currency: string; // ISO 4217, e.g. "USD", "INR"
  } | null;
  is_complete: boolean; // server-computed: true when all required fields are set
  updated_at: string; // ISO 8601
}

export type UserProfileUpdate = Partial<Omit<UserProfile, 'is_complete' | 'updated_at'>>;
```

---

## 3. Proposed Backend Contract

### 3.1 New Endpoints

| Method | Path | Purpose | Auth | Rate limit |
|--------|------|---------|------|------------|
| `GET` | `/users/me/profile` | Fetch current user's profile (404 if never created) | Required | None |
| `PUT` | `/users/me/profile` | Create or update current user's profile (upsert) | Required | None |

### 3.2 `GET /users/me/profile`

**Response 200:**
```json
{
  "first_name": "Sarvagya",
  "last_name": "Soni",
  "preferred_roles": ["Backend Developer", "Python Developer"],
  "preferred_locations": ["Bangalore, India", "Remote"],
  "work_mode": ["remote", "hybrid"],
  "employment_type": ["full_time"],
  "experience_level": "mid",
  "years_of_experience": "3-5",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "minimum_salary": { "amount": 1500000, "currency": "INR" },
  "is_complete": true,
  "updated_at": "2026-09-02T10:30:00Z"
}
```

**Response 404 (profile not created yet):**
```json
{
  "detail": "No profile on file. Complete your profile via PUT /users/me/profile."
}
```

### 3.3 `PUT /users/me/profile`

**Request body** (all fields optional, but at least the required ones must be present for `is_complete=true`):
```json
{
  "first_name": "Sarvagya",
  "last_name": "Soni",
  "preferred_roles": ["Backend Developer", "Python Developer"],
  "preferred_locations": ["Bangalore, India", "Remote"],
  "work_mode": ["remote", "hybrid"],
  "employment_type": ["full_time"],
  "experience_level": "mid",
  "years_of_experience": "3-5",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "minimum_salary": { "amount": 1500000, "currency": "INR" }
}
```

**Behavior:**
- **Upsert**: creates the profile if it doesn't exist, updates it if it does
- **Partial updates**: fields not in the request body are left unchanged
- **Empty arrays allowed** for optional multi-select fields (clearing a field is a valid edit)
- **Empty arrays NOT allowed** for `preferred_roles` and `preferred_locations` (the two required array fields) — server returns 400

**Response 200:** Same shape as `GET /users/me/profile` (with updated `is_complete` and `updated_at`)

**Response 400 (validation error):**
```json
{
  "detail": [
    {
      "loc": ["body", "preferred_roles"],
      "msg": "At least one role is required",
      "type": "value_error"
    }
  ]
}
```

### 3.4 Validation Rules (Backend)

| Field | Rule | Error message |
|-------|------|---------------|
| `first_name` | Required, 1-100 chars, trim whitespace | "First name is required" |
| `last_name` | Required, 1-100 chars, trim whitespace | "Last name is required" |
| `preferred_roles` | Array, min 1, max 10 items, each item 1-25 chars, no duplicates | "At least one role is required" / "Maximum 10 roles allowed" |
| `preferred_locations` | Array, min 1, max 10 items, each item 1-25 chars, no duplicates | "At least one location is required" / "Maximum 10 locations allowed" |
| `work_mode` | Array, each value must be in the allowed enum, no duplicates | "Invalid work mode" |
| `employment_type` | Array, each value must be in the allowed enum, no duplicates | "Invalid employment type" |
| `experience_level` | Single value, must be in the allowed enum | "Invalid experience level" |
| `years_of_experience` | Single value, must be in the allowed enum | "Invalid years of experience" |
| `skills` | Array, max 30 items, each item 1-50 chars, no duplicates | "Maximum 30 skills allowed" |
| `minimum_salary.amount` | If present, must be a positive integer | "Salary must be positive" |
| `minimum_salary.currency` | If `amount` is present, currency is required (3-letter code) | "Currency is required when salary is set" |

### 3.5 `is_complete` Logic (Backend-computed)

Server returns `is_complete: true` if and only if:
- `first_name` is non-empty (after trim)
- `last_name` is non-empty (after trim)
- `preferred_roles` has at least 1 item
- `preferred_locations` has at least 1 item

Otherwise `is_complete: false`.

---

## 4. Proposed Database Schema

### Option A (Recommended): Extend the `users` table

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `first_name` | `VARCHAR(100)` | nullable initially, must be non-null for `is_complete=true` | `NULL` | |
| `last_name` | `VARCHAR(100)` | nullable initially, must be non-null for `is_complete=true` | `NULL` | |
| `preferred_roles` | `ARRAY(VARCHAR(25))` | nullable | `NULL` | |
| `preferred_locations` | `ARRAY(VARCHAR(25))` | nullable | `NULL` | |
| `work_mode` | `ARRAY(VARCHAR(20))` | nullable | `NULL` | Enum values stored as strings |
| `employment_type` | `ARRAY(VARCHAR(20))` | nullable | `NULL` | Enum values stored as strings |
| `experience_level` | `VARCHAR(20)` | nullable | `NULL` | |
| `years_of_experience` | `VARCHAR(10)` | nullable | `NULL` | |
| `skills` | `ARRAY(VARCHAR(50))` | nullable | `NULL` | |
| `minimum_salary_amount` | `INTEGER` | nullable | `NULL` | |
| `minimum_salary_currency` | `VARCHAR(3)` | nullable | `NULL` | ISO 4217 code |
| `profile_updated_at` | `TIMESTAMP` | nullable | `NULL` | Set on every PUT |

**Why Option A over a separate `profiles` table:** 1:1 relationship with users, no need for joins, simpler queries. The profile is always owned by exactly one user.

### Alembic Migration

A new migration file should be added (e.g. `alembic/versions/xxxx_add_profile_fields_to_users.py`) that:
1. Adds the columns above (all nullable for backward compatibility with existing users)
2. Does NOT add `NOT NULL` constraints (existing users need to be able to log in without a profile)
3. Leaves validation to the application layer

---

## 5. Modified Existing Endpoint: `GET /jobs/suggested`

### Current behavior
- Uses the user's saved resume to generate a search query via Gemini
- Falls back to 404 if no resume

### New behavior
- Accepts a new query parameter: `use_preferences: bool = true`
- If `use_preferences=true` AND user has `is_complete=true` profile: build queries from `preferred_roles × preferred_locations` cartesian product, run each, deduplicate results
- If `use_preferences=true` AND user has no complete profile: return 400 with "Complete your profile to get personalized suggestions" (frontend should redirect to `/profile` in this case)
- If `use_preferences=false` (or query param omitted AND no profile): current resume-based behavior (backward compatible)

### Response shape
No change. Returns `SuggestedJobsResponse` as today.

### Backend implementation note
- Use the existing `/jobs/search` endpoint logic internally (no duplicate search code)
- Deduplicate results by job `link` (stable identifier from JSearch) — keep first occurrence
- No match scores in v1 (out of scope per Section 1)

---

## 6. Onboarding Flow

### New user (after register)
1. User submits registration form
2. Backend creates user, returns token
3. Frontend stores token, navigates to `/profile`
4. User sees onboarding form (2 steps: "About You" + "Job Preferences")
5. User submits form
6. Backend creates profile, returns `is_complete: true`
7. Frontend navigates to `/dashboard`

### Existing user (login)
1. User logs in
2. Frontend calls `GET /users/me/profile`
3. If 404 OR `is_complete: false` → navigate to `/profile`
4. If 200 with `is_complete: true` → navigate to `/dashboard`

### Route guard logic
A `<ProfileGate>` wrapper component that:
- Checks `GET /users/me/profile` on mount
- If incomplete: renders `<ProfileForm>` (no nav, no sidebar)
- If complete: renders the protected children
- If fetch fails with 401: lets normal auth flow handle it (redirect to login)
- No infinite redirect: only redirects to `/profile`, never back to itself

### User editing preferences (from sidebar)
1. User clicks "Preferences" in sidebar → navigates to `/profile`
2. Frontend fetches profile, pre-fills form
3. User edits, clicks "Save Changes"
4. Frontend sends `PUT /users/me/profile` with changed fields
5. On success: toast "Preferences updated successfully", stay on page
6. On error: toast error message, keep form values

---

## 7. File Map

### New Files (Frontend)

| Path | Purpose |
|------|---------|
| `job-tracker-frontend/src/features/profile/ProfilePage.tsx` | Page wrapper + onboarding guard |
| `job-tracker-frontend/src/features/profile/ProfileForm.tsx` | The actual form (2 steps) |
| `job-tracker-frontend/src/features/profile/ProfileOnboarding.tsx` | First-time onboarding variant |
| `job-tracker-frontend/src/features/profile/MultiSelect.tsx` | Reusable searchable multi-select with chips |
| `job-tracker-frontend/src/features/profile/SkillChips.tsx` | Enter-to-add chips input for skills |
| `job-tracker-frontend/src/features/profile/useProfile.ts` | Hook (fetch, update, state) |
| `job-tracker-frontend/src/features/profile/api.ts` | `profileApi.getProfile()`, `profileApi.updateProfile()` |
| `job-tracker-frontend/src/features/profile/types.ts` | TypeScript interfaces (Section 2) |
| `job-tracker-frontend/src/features/profile/validation.ts` | Client-side validation (mirrors backend rules) |
| `job-tracker-frontend/src/features/profile/ProfileDisplay.tsx` | Small component to show first name in Header/Sidebar |
| `job-tracker-frontend/src/features/profile/index.ts` | Barrel export, guarded by `FEATURES.profile` |
| `job-tracker-frontend/src/config/features.ts` | `FEATURES = { profile: true, ... }` |

### New Files (Backend)

| Path | Purpose |
|------|---------|
| `job-tracker-backend/app/routers/profile.py` | Routes: `GET /users/me/profile`, `PUT /users/me/profile` |
| `job-tracker-backend/alembic/versions/xxxx_add_profile_fields_to_users.py` | Migration for new columns |

### Modified Files (Frontend, all guarded by `FEATURES.profile`)

| Path | Change |
|------|--------|
| `job-tracker-frontend/src/App.tsx` | Add `/profile` route |
| `job-tracker-frontend/src/components/layout/Sidebar.tsx` | Add "Preferences" nav item |
| `job-tracker-frontend/src/components/layout/Header.tsx` | Show first name from profile (falls back to email) |
| `job-tracker-frontend/src/auth/AuthContext.tsx` | Expose `user.first_name` after profile loads |
| `job-tracker-frontend/src/pages/Register.tsx` | Redirect to `/profile` on successful register (was: `/dashboard`) |
| `job-tracker-frontend/src/pages/Login.tsx` | Check profile completion, redirect accordingly |
| `job-tracker-frontend/src/pages/Suggestions.tsx` | Use new preference-based suggestions |
| `job-tracker-frontend/src/hooks/useJobs.ts` | Pass `use_preferences` to suggested jobs query |

### Modified Files (Backend)

| Path | Change |
|------|--------|
| `job-tracker-backend/app/models.py` | Add 11 new columns to `User` model (Section 4) |
| `job-tracker-backend/app/schemas.py` | Add `UserProfile` and `UserProfileUpdate` Pydantic models |
| `job-tracker-backend/app/main.py` | Include the new `profile` router |
| `job-tracker-backend/app/routers/jobs.py` | Add `use_preferences` query param to `/jobs/suggested` |
| `job-tracker-backend/app/routers/auth.py` | No change needed (register flow unchanged) |

### Documentation Files

| Path | Change |
|------|--------|
| `HANDOVER.md` | Add "Phase 7: Profile & Preferences" section after implementation |
| `DECISIONS.md` | Add new decisions (profile pattern, onboarding force, gate logic, etc.) |
| `job-tracker-backend/README.md` | Update endpoint list |
| `job-tracker-frontend/README.md` | Update component/feature list |

---

## 8. Rollout Checklist

- [ ] Feature flag added: `FEATURES.profile = true` in `src/config/features.ts`
- [ ] Feature README reviewed by backend team
- [ ] Backend migration created and tested locally
- [ ] Backend routes implemented and tested (unit + integration tests)
- [ ] Backend `GET /jobs/suggested` extension implemented and tested
- [ ] Frontend types, API client, hook, validation implemented
- [ ] Frontend form components implemented
- [ ] Frontend page + onboarding gate implemented
- [ ] Sidebar + Header wire-up done
- [ ] Login/Register flow updated
- [ ] Suggestions page updated
- [ ] All wire-up changes guarded by `FEATURES.profile`
- [ ] Existing tests pass
- [ ] New tests added (hook, form validation, gate logic)
- [ ] Manual end-to-end test: register → onboarding → dashboard → suggestions
- [ ] Manual test: existing user without profile → forced to onboarding
- [ ] Manual test: edit preferences from sidebar
- [ ] Manual test: update preferences → suggestions reflect changes
- [ ] Lint passes
- [ ] Build passes
- [ ] HANDOVER.md updated
- [ ] DECISIONS.md updated

---

## 9. Removal Steps

If this feature needs to be ripped out (in order):

1. **Disable the feature flag** (kills the feature at runtime, no code deletion):
   - Set `FEATURES.profile = false` in `src/config/features.ts`
2. **Delete the frontend feature directory**:
   - `rm -rf job-tracker-frontend/src/features/profile/`
3. **Revert frontend wire-up touches** (5 small diffs, all guarded by flag):
   - `src/App.tsx` — remove `/profile` route
   - `src/components/layout/Sidebar.tsx` — remove "Preferences" nav item
   - `src/components/layout/Header.tsx` — revert first name display
   - `src/auth/AuthContext.tsx` — revert first name field
   - `src/pages/Register.tsx` — revert redirect to `/profile`
   - `src/pages/Login.tsx` — revert profile-completion check
   - `src/pages/Suggestions.tsx` — revert preference-based suggestions
   - `src/hooks/useJobs.ts` — revert `use_preferences` param
4. **Delete the backend feature file**:
   - `rm job-tracker-backend/app/routers/profile.py`
5. **Revert backend edits**:
   - `app/models.py` — remove profile columns
   - `app/schemas.py` — remove profile schemas
   - `app/main.py` — remove profile router include
   - `app/routers/jobs.py` — revert `use_preferences` param
6. **Drop the database columns** (revert the migration):
   - `alembic downgrade -1`
7. **Delete this README and the `features/` directory** if no other features use it

Total: 2 commits (one to disable, one to delete). All changes are isolated and reversible.

---

## 10. Open Questions

Items to confirm before implementation starts:

- [ ] **Currency support:** Should `minimum_salary.currency` accept any 3-letter code, or restrict to a list (e.g. `INR`, `USD`, `EUR`)? Frontend can use a free-text field or a dropdown.
- [ ] **Skills max:** Is 30 skills enough? (Proposed default)
- [ ] **Experience level vs years:** Both optional and both single-select. Is that redundant? (Prompt said both, so we keep both — but flagging.)
- [ ] **Location radius:** Prompt mentioned it but the JSearch API we use doesn't support radius. **Confirmed out of scope** — no radius field.
- [ ] **Work authorization:** Prompt said NOT to collect it. Confirmed out of scope.
- [ ] **Date of birth, gender, etc.:** Prompt said NOT to collect. Confirmed out of scope.
- [ ] **Default values for optional fields:** When a user doesn't set them, what does the server return? (Proposed: empty array `[]` for multi-selects, `null` for single-selects and salary.)
- [ ] **What if a user sets `work_mode: ["remote"]` but the JSearch API doesn't return `remote_jobs_only` info?** Frontend will show the preference but won't filter on it. Confirmed acceptable per prompt Section 24 ("Do not fabricate").
- [ ] **Onboarding vs registration:** Should the user land directly on the form after register, or see a "Welcome! Let's set up your profile" screen first? (Proposed: direct to form, less friction.)

---

## 11. Implementation Notes

### DB Migration
- **Applied:** `alembic/versions/a1b2c3d4e5f6_add_profile_fields_to_users.py` — adds 12 nullable columns to `users` table
- **Status:** Applied to live DB on 2026-09-02
- **Lesson:** Any change to `app/models.py` MUST be accompanied by `alembic upgrade head` before the backend restarts (see BACKEND_ISSUES_REPORT.md Item -1)

### Login Issue (2026-09-02)
The unapplied migration caused `POST /auth/login` to return 500 for all users. Fixed by running `alembic upgrade head`. Documented in BACKEND_ISSUES_REPORT.md Item -1.

---

## 12. Related Documentation

- `HANDOVER.md` — will be updated after implementation
- `DECISIONS.md` — will be updated after implementation
- `BACKEND_ISSUES_REPORT.md` — track any backend issues found during development
- `job-tracker-frontend/src/features/profile/` — the feature's frontend code
- `job-tracker-backend/app/routers/profile.py` — the feature's backend code
