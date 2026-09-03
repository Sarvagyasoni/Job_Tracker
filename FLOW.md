# Job Application Tracker — User Flows

## 1. Registration Flow
```
User visits /register
  ↓
Fills email + password (min 8 chars)
  ↓
Clicks "Register"
  ↓
POST /auth/register
  ↓
Success: 201 + UserOut → Auto-login → Redirect to /dashboard
  ↓
Error: 400 (email exists) / 422 (validation) → Show inline error
```

## 2. Login Flow
```
User visits /login
  ↓
Fills email + password
  ↓
Clicks "Login"
  ↓
POST /auth/login
  ↓
Success: 200 + Token → Store in localStorage
  ↓
If profile feature enabled:
  GET /users/me/profile
  ↓
  Profile complete → Redirect to /dashboard
  Profile incomplete/404 → Redirect to /onboarding
If profile feature disabled:
  Redirect to /dashboard
  ↓
Error: 401 (bad credentials) / 422 (validation) / 429 (rate limit) → Show inline error
```

## 3. Authenticated Session
```
App loads
  ↓
Check localStorage for token
  ↓
If token exists: call GET /jobs to validate
  ↓
  Success → Set user in context → Show dashboard
  Failure (401) → Clear token → Redirect to /login
```

## 4. Dashboard / Kanban Board
```
User on /dashboard
  ↓
GET /jobs
  ↓
Group jobs by status (applied, interviewing, offer, rejected)
  ↓
Render KanbanBoard with 4 columns
  ↓
User actions:
  - Click "New Application" → Open JobForm modal (create mode)
  - Click "View" on job card → Open JobDetail modal
  - Click "Edit" on job card → Open JobForm modal (edit mode)
  - Click "Delete" on job card → Open confirmation modal
  - Drag job card between columns → PUT /jobs/:id {status}
  - Click "Discover Jobs" → Open JobSearch modal
```

## 5. Create Job
```
User clicks "New Application"
  ↓
JobForm opens in modal
  ↓
Fills: company (required), role, status, date_applied, link, notes
  ↓
Clicks "Create Application"
  ↓
POST /jobs (submit disabled while pending)
  ↓
Success: 201 + JobOut → Toast "Application created" → Close modal → Kanban updates
  ↓
Error: 400 (validation) → Field-level inline errors
```

## 6. View Job Details
```
User clicks "View" on job card
  ↓
JobDetail modal opens with full details
  ↓
Shows: company, role, status badge, date applied, link, notes, timestamps
  ↓
User can: Close, or click "Edit" → switches to edit mode
```

## 7. Edit Job
```
User clicks "Edit" on job card or in JobDetail
  ↓
JobForm opens in modal pre-filled with job data
  ↓
User modifies fields
  ↓
Clicks "Save Changes"
  ↓
PUT /jobs/:id (submit disabled while pending)
  ↓
Success: 200 + JobOut → Toast "Application updated" → Close modal → Kanban updates
  ↓
Error: 400 (validation) → Field-level inline errors
```

## 8. Update Job Status (Drag-and-Drop)
```
User drags job card from one column to another
  ↓
Optimistic UI update (card moves immediately)
  ↓
PUT /jobs/:id {status: "new_status"}
  ↓
Success: 200 + JobOut → Toast "Status updated" (optional)
  ↓
Error: 404 / 401 / network → Toast error → Revert card to original column → Refetch
```

## 9. Delete Job
```
User clicks "Delete" on job card
  ↓
Confirmation modal: "Are you sure? This cannot be undone."
  ↓
User clicks "Delete" (button disabled while pending)
  ↓
DELETE /jobs/:id
  ↓
Success: 204 → Toast "Application deleted" → Remove from Kanban
  ↓
Error: 404 / 401 → Toast error
```

## 10. Job List View (Alternative)
```
User on /jobs (or filtered view)
  ↓
GET /jobs (with optional ?status= filter)
  ↓
Render JobList with JobCards in responsive grid
  ↓
Same actions as Kanban: Create, View, Edit, Delete, Status change
```

## 11. Profile Onboarding
```
User (new or without profile) lands on /onboarding
  ↓
Two-step form: "About You" + "Job Preferences"
  ↓
Step 1: first_name, last_name (required)
  ↓
Step 2: preferred_roles, preferred_locations (required),
        work_mode, employment_type, experience_level,
        years_of_experience, skills, minimum_salary (optional)
  ↓
Clicks "Complete Setup"
  ↓
Client-side validation (25 char/10 item limits, no duplicates)
  ↓
PUT /users/me/profile
  ↓
Success: 200 + is_complete: true → Redirect to /dashboard
  ↓
Error: 400 (validation) → Field-level inline errors
```

## 12. Profile Edit (from Sidebar)
```
User clicks "Preferences" in sidebar
  ↓
Navigates to /profile
  ↓
GET /users/me/profile
  ↓
If 404 → Show empty form (first-time)
If 200 → Pre-fill form with existing data
  ↓
User edits fields
  ↓
Clicks "Save Changes"
  ↓
PUT /users/me/profile
  ↓
Success: 200 → Toast "Preferences updated" → Stay on page
  ↓
Error: 400 (validation) → Field-level errors
```

## 13. Personalized Suggestions
```
User on /suggestions
  ↓
GET /jobs/suggested?page=1&use_preferences=true
  ↓
If profile complete:
  Backend builds roles × locations cartesian product
  Runs each combination via JSearch
  Deduplicates by job link
  ↓
If no profile or use_preferences=false:
  Falls back to resume-based query generation
  ↓
Results render as JobSearchResultCard cards
  ↓
Context bar shows active roles + locations
  ↓
"Edit Preferences" link → /profile
```

## 14. Logout
```
User clicks logout in header
  ↓
Clear localStorage token
  ↓
Clear auth context
  ↓
Redirect to /login
```

## 12. Job Search
```
User clicks "Discover Jobs" on dashboard
  ↓
JobSearch modal opens
  ↓
User enters keywords (e.g., "backend developer in Bangalore")
  ↓
User optionally checks "Remote only"
  ↓
User presses Enter or clicks "Search"
  ↓
GET /jobs/search?query=...&page=1&remote_only=false
  ↓
Loading skeletons shown
  ↓
Results render as JobSearchResultCard cards:
  - Company, role, location, posted date, source badge
  - Snippet/description
  - "View original posting" link (opens in new tab)
  - "Copy link" button (copies URL to clipboard, shows toast)
  - "Track Job" button
  ↓
User clicks "Track Job" on a result
  ↓
Confirmation modal: "Add 'Role' at 'Company' to your tracked applications?"
  ↓
User confirms
  ↓
POST /jobs with pre-filled data (company, role, status=applied, date_applied=today, link, notes with source info)
  ↓
Success: 201 + JobOut → Toast "Job tracked" → Result card shows tracked state
  ↓
Error: Toast with user-friendly message
```

## 13. Job Search — Load More
```
User scrolls to bottom of results
  ↓
Clicks "Load More" button
  ↓
GET /jobs/search?query=...&page=2&remote_only=false
  ↓
Button shows "Loading..."
  ↓
New results appended to list
  ↓
Button re-enabled
```

## 14. Job Search — Copy Link
```
User clicks "Copy link" on result card
  ↓
navigator.clipboard.writeText(jobUrl)
  ↓
Button shows "Copied!" for 2 seconds
  ↓
Toast "Link copied" (optional)
```

## 15. Job Search — Empty/Error States
```
Empty query → Search button disabled
No results → Illustrated empty state with "Try adjusting search terms"
API error (missing JSEARCH_API_KEY) → Clear error with hint about backend config
Rate limit (429) → Toast "Too many requests, please wait"
Network error → Toast "Connection failed"
Server error (500) → Toast "Something went wrong"
Timeout → Toast "Request timed out"
```

## 16. Toast Notifications
```
Any operation completes
  ↓
Toast appears bottom-right:
  - Success: green, "Application created/updated/deleted"
  - Error: red, user-friendly message
  - Info: blue, informational
  - Warning: amber, cautionary
  ↓
Auto-dismiss after 5s with progress bar
  ↓
Manual dismiss via close button
```

## 17. Resume Upload
```
User clicks "Resume" tab on Dashboard
  ↓
ResumeManager component renders
  ↓
User clicks "Upload Resume" → File picker (PDF/DOCX, 5MB max)
  ↓
Frontend validates file type, size
  ↓
POST /resume (multipart/form-data)
  ↓
Backend extracts text (magic-byte validation, pypdf/python-docx)
  ↓
Success: Toast "Resume uploaded" → Shows filename + upload date
Error: Toast with user-friendly message (corrupted, wrong type, too large, no text)
```

## 18. ATS Score (AI)
```
User on Resume tab with resume uploaded
  ↓
Clicks "Get ATS Score"
  ↓
Enters job description → Clicks "Analyze"
  ↓
POST /resume/ats-score { job_description }
  ↓
Loading state
  ↓
Backend calls Gemini with structured output (ATSScoreResponse)
  ↓
Success: Shows match score (0-100), matched/missing keywords, summary
Error: Toast with user-friendly message (missing API key, rate limit, timeout)
```

## 19. Tailor Bullets (AI) — CURRENTLY BROKEN
```
User on Resume tab with resume uploaded
  ↓
Clicks "Tailor Bullets"
  ↓
Enters job description → Clicks "Generate"
  ↓
POST /resume/tailor-bullets { job_description }
  ↓
Backend calls Gemini with response_schema=list[str] (BUG: bare type)
  ↓
Returns 502: "AI provider returned an unreadable response"
  ↓
Frontend shows error toast
```
**Note**: This feature is broken due to backend bug. See `BACKEND_ISSUES_REPORT.md` Item 1.

## 20. Suggested Jobs (AI-Powered Search)
```
User clicks "Suggestion" tab on Dashboard
  ↓
GET /jobs/suggested?page=1
  ↓
Backend: Reads user's resume → Gemini generates search query → JSearch API
  ↓
Results render as JobSearchResultCard cards (same as Job Search)
  ↓
User can "Track Job" to save to applications
Error: If no resume → 404 "Upload a resume first"
Error: If missing GEMINI_API_KEY or JSEARCH_API_KEY → 500 with hint
```

## Error Handling Flow
```
Any API call fails
  ↓
Axios interceptor catches
  ↓
Normalize error:
  - 400: validation errors → field-level messages
  - 401: auth expired → logout + redirect to /login
  - 403: forbidden → "Access denied"
  - 404: not found → "Job not found"
  - 429: rate limited → "Too many attempts, wait"
  - 500: server error → "Something went wrong"
  - Network: "Connection failed. Check your internet."
  - Timeout: "Request timed out"
  ↓
Show toast with user-friendly message
  ↓
Return consistent error object to caller
```