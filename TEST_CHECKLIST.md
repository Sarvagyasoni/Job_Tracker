# Job Application Tracker — Test Checklist

## Pre-Test Setup
- [ ] Backend running at `http://localhost:8000`
- [ ] Frontend running at `http://localhost:5173`
- [ ] Database migrated (`alembic upgrade head`)
- [ ] `.env` configured with `VITE_API_URL=http://localhost:8000`

## Authentication Tests

### Registration
- [ ] Valid email + password (8+ chars) → success → redirect to dashboard
- [ ] Duplicate email → shows "Email already registered"
- [ ] Invalid email format → shows validation error
- [ ] Password < 8 chars → shows "password must be at least 8 characters"
- [ ] Empty fields → shows required field errors
- [ ] Rate limit (6 rapid requests) → shows "Too many requests" message
- [ ] **Password toggle shows/hides password**
- [ ] **First validation error shown in toast on submit**

### Login
- [ ] Valid credentials → success → token stored → redirect to dashboard
- [ ] Wrong password → shows "Incorrect email or password"
- [ ] Non-existent email → shows "Incorrect email or password" (same message)
- [ ] Empty fields → shows required field errors
- [ ] Rate limit (6 rapid requests) → shows rate limit message
- [ ] **Password toggle shows/hides password**
- [ ] **Backend 401 message shown in toast (not redirect)**

### Session Persistence
- [ ] Refresh page while logged in → stays logged in (token in localStorage)
- [ ] Close/open browser → stays logged in
- [ ] Expired token (manually set old expiry) → auto-logout → redirect to login

### Logout
- [ ] Click logout → clears token → redirects to login
- [ ] After logout, cannot access /dashboard → redirects to login

## Protected Route Tests
- [ ] Access /dashboard without login → redirects to /login
- [ ] Access /jobs without login → redirects to /login
- [ ] Direct API call with expired token → 401 → auto-logout

## Jobs CRUD Tests

### Kanban Board (GET /jobs)
- [ ] Empty state → shows illustrated empty state + CTA
- [ ] 4 columns render: Applied, Interviewing, Offer, Rejected
- [ ] Column headers show correct counts
- [ ] Jobs grouped correctly by status
- [ ] Loading state → shows skeleton cards with shimmer
- [ ] Error state → shows retry button
- [ ] **Auto-fetches jobs on dashboard mount (useEffect)**

### Create Job (POST /jobs)
- [ ] Required only (company) → creates job with defaults
- [ ] All fields filled → creates job with all data
- [ ] Invalid link (not http/https) → shows field error
- [ ] Empty company → shows "company is required"
- [ ] Date applied in future → accepted (backend allows)
- [ ] Submit button disabled while pending
- [ ] Success → toast "Application created" → closes modal → Kanban updates
- [ ] Error → toast with user-friendly message

### View Job Details
- [ ] Click "View" on job card → opens JobDetail modal
- [ ] Shows: company, role, status badge, date applied, link, notes, timestamps
- [ ] Status badge color matches column
- [ ] "Edit" button switches to edit mode
- [ ] "Close" button dismisses modal
- [ ] ESC key dismisses modal
- [ ] Click overlay dismisses modal

### Edit Job (PUT /jobs/:id)
- [ ] Click "Edit" → opens JobForm pre-filled
- [ ] Modify any field → persists on save
- [ ] Partial update (only notes) → other fields unchanged
- [ ] Invalid status value → 400 → field error
- [ ] Invalid link → field error
- [ ] Empty company on update → field error
- [ ] Submit button disabled while pending
- [ ] Success → toast "Application updated" → closes modal → Kanban updates

### Drag-and-Drop Status Change
- [ ] Drag job from Applied → Interviewing → PUT /jobs/:id {status: "interviewing"}
- [ ] Drag job from Interviewing → Offer → PUT /jobs/:id {status: "offer"}
- [ ] Drag job from Offer → Rejected → PUT /jobs/:id {status: "rejected"}
- [ ] Drag job back (Rejected → Applied) → works
- [ ] Optimistic UI: card moves immediately on drop
- [ ] Success: card stays in new column
- [ ] Network error: toast error → card reverts to original column
- [ ] 401/404 error: toast error → card reverts
- [ ] Keyboard: Tab to card, Space to lift, arrows to move, Enter to drop

### Delete Job (DELETE /jobs/:id)
- [ ] Click "Delete" → confirmation modal appears
- [ ] Modal: "Are you sure? This cannot be undone."
- [ ] Cancel → modal closes, job remains
- [ ] Confirm → DELETE /jobs/:id → toast "Application deleted" → removed from Kanban
- [ ] Delete button disabled while pending
- [ ] Delete non-existent → 404 → toast error

### Job List View (Alternative)
- [ ] Grid layout on desktop, stacked on mobile
- [ ] Status filter dropdown works
- [ ] Same create/view/edit/delete actions work

## Job Search Tests (Phase 3)

### Search Interface
- [ ] Click "Discover Jobs" → opens JobSearch modal
- [ ] Modal is large (xl), centered, with overlay
- [ ] Search input focused on open
- [ ] Placeholder shows example query
- [ ] "Remote only" checkbox works
- [ ] Enter key submits search
- [ ] Search button disabled when query empty
- [ ] Clear button resets form and results

### Search Execution
- [ ] Valid query → GET /jobs/search?query=...&page=1&remote_only=false
- [ ] Loading skeletons (3 cards) shown during fetch
- [ ] Remote only → remote_only=true in request
- [ ] Results render as cards in responsive grid
- [ ] Each card shows: company, role, location, posted date, source badge, snippet
- [ ] "View original posting" link opens in new tab
- [ ] "Copy link" button copies URL, shows "Copied!" for 2s
- [ ] "Track Job" button present

### Search Results — Track Job
- [ ] Click "Track Job" → confirmation modal appears
- [ ] Modal shows role and company name
- [ ] Cancel → modal closes, no API call
- [ ] Confirm → POST /jobs with pre-filled data (company, role, status=applied, date_applied=today, link, notes with source/location/posted)
- [ ] Submit disabled while tracking
- [ ] Success → toast "Job tracked" → card updates
- [ ] Error → toast with user-friendly message

### Search Results — Copy Link
- [ ] Click "Copy link" → navigator.clipboard.writeText() called
- [ ] Button shows "Copied!" for 2 seconds
- [ ] Toast notification (optional)

### Search Pagination
- [ ] "Load More" button appears after results
- [ ] Click → GET /jobs/search?query=...&page=2
- [ ] Button shows "Loading..." while fetching
- [ ] New results appended to existing list
- [ ] Button re-enabled after load

### Search Error Handling
- [ ] Missing JSEARCH_API_KEY on backend → error with config hint
- [ ] Rate limit (429) → toast "Too many requests, please wait"
- [ ] Network error → toast "Connection failed"
- [ ] Server error (500) → toast "Something went wrong"
- [ ] Timeout → toast "Request timed out"
- [ ] Empty results → illustrated empty state with "Try adjusting search terms"
- [ ] Empty query → search button disabled

### Search Accessibility
- [ ] Modal traps focus
- [ ] ESC key closes modal
- [ ] Tab order logical through form and results
- [ ] Live region announces result count
- [ ] Buttons have ARIA labels
- [ ] Copy link announces "Copied" to screen readers

## UI/UX Tests

### Forms
- [ ] Password visibility toggle works (show/hide)
- [ ] Form validation on blur + on submit
- [ ] Disabled submit while loading
- [ ] Error messages clear on input change
- [ ] Enter key submits form
- [ ] Tab order logical

### Navigation
- [ ] Mobile menu opens/closes
- [ ] Logo links to dashboard (if logged in) or login
- [ ] Active route highlighted
- [ ] Keyboard navigable (Tab, Enter, Escape)

### Theme
- [ ] Dark/light toggle switches theme
- [ ] Preference persists on refresh
- [ ] System preference detected on first visit
- [ ] No flash of wrong theme on load

### Auth Page UI (New)
- [ ] **Frosted glass input wrapper with backdrop blur**
- [ ] **Input focus state shows blue ring**
- [ ] **Input error state shows red ring**
- [ ] **Password toggle button works (show/hide)**
- [ ] **Auth card is square (1:1) on mobile < 480px**
- [ ] **Auth card is 4:3 on tablet 481-600px**
- [ ] **Auth card is larger square on desktop > 600px**
- [ ] **Card padding increases at each breakpoint**
- [ ] **Max width 600px on desktop**

### Kanban Board
- [ ] Horizontal scroll on desktop (> 1024px)
- [ ] Vertical stack on tablet/mobile (< 1024px)
- [ ] Column widths consistent
- [ ] Drag handle visible on hover/focus
- [ ] Active column highlighted during drag
- [ ] Empty drop zone shows "Drop here"

### Toasts
- [ ] Success toast: green, appears bottom-right
- [ ] Error toast: red, user-friendly message
- [ ] Auto-dismiss after 5s with progress bar
- [ ] Manual dismiss via close button
- [ ] Multiple toasts stack correctly
- [ ] Mobile: full-width, bottom-anchored

### Accessibility
- [ ] Skip-to-content link works (Tab on load)
- [ ] Focus outlines visible on all interactive elements
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast passes WCAG AA
- [ ] Screen reader announces errors
- [ ] Modal traps focus
- [ ] Drag-and-drop keyboard accessible
- [ ] Live regions for status changes

### Responsive
- [ ] Mobile (< 640px): stacked layout, hamburger menu, kanban vertical
- [ ] Tablet (640-1024px): adapted layout, kanban vertical scroll
- [ ] Desktop (> 1024px): full layout, kanban horizontal scroll
- [ ] Job cards responsive width
- [ ] Search modal full-width on mobile

## Error Handling Tests
- [ ] Network offline → toast "Connection failed"
- [ ] Backend 500 → toast "Something went wrong"
- [ ] Validation errors → field-level inline messages
- [ ] 401 on any request → auto-logout + redirect to /login
- [ ] 403 → toast "Access denied"
- [ ] 404 → toast "Not found"
- [ ] Rate limit (429) → toast "Too many attempts, wait"
- [ ] Duplicate submit prevented (button disabled)

## Security Tests (New)
- [ ] JWT token not logged in console/debugger
- [ ] Token cleared from localStorage on logout
- [ ] 401 response redirects to /login (hardcoded path)
- [ ] External links have `rel="noopener noreferrer"`
- [ ] No `dangerouslySetInnerHTML` or `innerHTML` usage
- [ ] Production HTTPS configuration documented in .env.example
- [ ] Rate limiting respected (5 req/min auth endpoints)
- [ ] Password never stored in frontend state after submit
- [ ] No API keys/secrets in frontend source or git history
- [ ] Token not exposed in React DevTools component props
- [ ] Error messages don't leak backend stack traces
- [ ] CSP-compatible (no inline styles/scripts required)
- [ ] No open redirect vulnerabilities (hardcoded /login redirect)
- [ ] Copy-to-clipboard only for user-provided URLs
- [ ] File upload not implemented (N/A)

## Edge Cases
- [ ] Very long company name → wraps gracefully
- [ ] Very long notes → scrollable in modal
- [ ] Special characters in fields → handled correctly
- [ ] Rapid clicks (double submit) → prevented by disabled button
- [ ] Browser back button after logout → doesn't show protected page
- [ ] Drag card to same column → no API call
- [ ] Refresh during drag → no orphaned state
- [ ] Search modal open during drag → no conflict
- [ ] Track same job twice → creates duplicate (backend allows)