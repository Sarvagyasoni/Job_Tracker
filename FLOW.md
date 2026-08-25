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
Success: 200 + Token → Store in localStorage → Redirect to /dashboard
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

## 11. Logout
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