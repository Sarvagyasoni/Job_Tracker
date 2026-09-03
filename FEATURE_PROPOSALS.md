# Feature Proposals

This document is the **single source of truth** for cross-team feature work. Every new feature (or change) that touches both frontend and backend gets a proposal here **before** code is written.

The goal: make cross-team changes **easy to find, identify, edit, and remove** — like Lego blocks. If a feature needs to be rolled back, it can be removed in 5 minutes with no archaeology.

---

## How to Use This Document

1. **Propose** — Copy the template below, fill it in, append to the "Active Proposals" section.
2. **Build** — Code uses the **same identifier** in both repos (e.g. `FEATURE_INTERVIEW_PREP`). This is the search key.
3. **Identify** — Backend team greps for the identifier, frontend team greps for the same identifier. Both find it instantly.
4. **Edit** — Make changes under the same identifier. Update the proposal's "Status" section.
5. **Remove** — Delete the proposal from this file + grep + delete all matches. No orphan code.

---

## Proposal Template

Copy this block, replace `[ID]` with a stable identifier (e.g. `FEATURE_INTERVIEW_PREP`), and fill in every section. **Do not skip sections** — empty sections are a smell that the proposal isn't ready.

```markdown
### [ID]: [Short Title]

**Status:** 🟡 Proposed | 🟢 Approved | 🔨 In Progress | ✅ Complete | ❌ Rejected | 🗑️ Removed
**Owner (frontend):** [name]
**Owner (backend):** [name]
**Created:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD

#### What
One-paragraph description of the feature. What does the user see/do?

#### Why
The problem it solves or the value it adds. Link to user feedback, analytics, or a related issue.

#### User Story
> As a [user type], I want to [action] so that [outcome].

#### Backend Changes
- New endpoints (method + path + purpose)
- Modified endpoints
- Schema changes (new fields, new tables, migrations)
- New env vars
- Rate limit changes
- Deprecation: list any endpoints this replaces

#### Frontend Changes
- New pages / routes
- New components
- New hooks
- New API client methods
- New env vars
- Modified existing files
- New dependencies

#### Feature Flag
- **Identifier:** `[ID]` (must match the proposal header)
- **Default state:** `off` for new features, `on` for changes
- **Where it's checked:**
  - Backend: `app/feature_flags.py` (proposed) — list functions that gate the code
  - Frontend: `src/featureFlags.ts` (proposed) — list components/routes that conditionally render
- **How to toggle:** [env var / config file / kill switch endpoint]
- **Rollback plan:** set flag to `off` and restart. Feature disappears, no other functionality affected.

#### Files Touched
- Backend: list every file (path + one-line description of change)
- Frontend: list every file (path + one-line description of change)

#### Test Plan
- [ ] Backend unit tests for new logic
- [ ] Backend integration tests for new endpoints
- [ ] Frontend component tests
- [ ] Manual test steps:
  1. ...
  2. ...

#### Rollback / Removal Plan
Exact steps to remove this feature cleanly. Must take < 5 minutes.
1. Set flag to `off` (instant kill switch, no restart needed if runtime-checked)
2. Run `grep -r "[ID]"` in both repos
3. Delete each match
4. Delete this proposal block
5. Verify build passes and tests pass

#### Open Questions
- ...
```

---

## Naming Convention for Identifiers

Format: `FEATURE_<AREA>_<NAME>` (uppercase, underscores)

- `FEATURE_INTERVIEW_PREP`
- `FEATURE_SALARY_INSIGHTS`
- `FEATURE_DARK_MODE` (would've been used for the dark/light mode)
- `FEATURE_ENHANCED_RESUME` (for the resume PDF generator)
- `CHANGE_AUTH_REFRESH_TOKEN`

Use `FEATURE_` for net-new user-facing functionality, `CHANGE_` for modifications to existing behavior. This makes `git grep` results sortable and predictable.

---

## Active Proposals

*(Append new proposals below this line. Most recent at the bottom.)*
