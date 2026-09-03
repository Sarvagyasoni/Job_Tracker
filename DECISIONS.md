# Job Application Tracker — Architecture Decisions

## 1. Framework: React + TypeScript + Vite
**Decision**: Use React 19 with TypeScript and Vite.
**Rationale**: 
- Strong ecosystem, team familiarity
- TypeScript catches API contract mismatches early
- Vite provides fast HMR and optimized builds
- No need for Next.js (no SSR requirement)

## 2. Routing: React Router v6
**Decision**: Use `react-router-dom` for client-side routing.
**Rationale**: Standard, lightweight, supports nested routes and lazy loading.

## 3. State Management: React Context + Custom Hooks
**Decision**: No Redux, Zustand, or React Query. Use Context for auth, custom hooks for data fetching.
**Rationale**:
- App scope is small (auth + jobs CRUD)
- Avoids extra dependencies
- Custom hooks are simple and testable
- React Query adds ~13kb; not justified for this scale

## 4. API Client: Axios
**Decision**: Use Axios over fetch.
**Rationale**:
- Built-in interceptors for auth headers and error normalization
- Automatic JSON parsing
- Request/response typing with generics
- Cancel tokens for cleanup

## 5. Styling: CSS Variables + Plain CSS Modules
**Decision**: No Tailwind, Styled Components, or Emotion.
**Rationale**:
- Zero runtime overhead
- CSS variables enable dark/light mode without JS
- Small bundle size
- Team can write standard CSS
- Scoped styles via CSS Modules (`Component.module.css`)

## 6. Form Handling: Controlled Components + Custom Validation
**Decision**: No React Hook Form, Formik, or Zod.
**Rationale**:
- Forms are simple (login, register, job create/edit)
- Custom validation is straightforward
- Avoids ~10kb+ dependency
- Full control over error display and UX

## 7. Date Handling: date-fns
**Decision**: Use `date-fns` for date formatting/parsing.
**Rationale**: Lightweight, modular, tree-shakeable. Native `Date` API is painful.

## 8. Token Storage: localStorage
**Decision**: Store JWT in localStorage (not httpOnly cookie).
**Rationale**:
- Backend uses Bearer token in Authorization header
- localStorage accessible to JS for attaching to requests
- Simpler than cookie-based auth with CSRF concerns
- Acceptable risk for this app scope

## 9. Error Handling: Normalized Error Objects
**Decision**: Axios interceptor converts all errors to `{ message: string, fieldErrors?: Record<string, string> }`.
**Rationale**:
- Consistent error shape across components
- Field errors map directly to form inputs
- User-friendly messages (not raw backend details)

## 10. Dark/Light Mode: CSS Variables + localStorage
**Decision**: Toggle `data-theme` on `<html>`, persist preference in localStorage.
**Rationale**:
- No flash of wrong theme on load
- Works without JS (CSS-only fallback)
- Simple implementation

## 11. Accessibility: Semantic HTML + Focus Management
**Decision**: Build accessible by default, not as afterthought.
**Rationale**:
- Legal/ethical requirement
- Better UX for all users
- Skip link, focus outlines, ARIA labels, semantic landmarks

## 12. Component Structure: Flat + Feature-Focused
**Decision**: Group by feature (`components/jobs/`, `components/layout/`) not type.
**Rationale**:
- Easier to find related files
- Scales better as features grow
- Colocates types, hooks, styles with components

## 13. Drag-and-Drop: @dnd-kit
**Decision**: Use `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` for Kanban drag-and-drop.
**Rationale**:
- Lightweight (~10kb), tree-shakeable
- Accessible (keyboard + screen reader support)
- Headless (no imposed markup/styling)
- Active maintenance, TypeScript-first
- Better than react-beautiful-dnd (unmaintained) or react-dnd (complex)

## 14. Auth Form Design: Frosted Glass (Glassmorphism)
**Decision**: Use frosted glass / glassmorphism style for auth page inputs and card.
**Rationale**:
- Modern, visually appealing design trend
- `backdrop-filter: blur(20px)` with semi-transparent backgrounds
- Layered shadows for depth
- Works in both light/dark modes via CSS variables
- Password toggle integrated into Input component
- Responsive: square on mobile, 4:3 on tablet, larger square on desktop

## 15. Error Handling: First Validation Error as Main Message
**Decision**: For 400 validation errors, use the first field error as the primary toast message while preserving all field errors for inline display.
**Rationale**:
- Better UX than generic "Please check your input"
- Users immediately see what's wrong
- Field errors still map to individual inputs
- Consistent with backend Pydantic error structure

## 16. Auth Endpoint 401 Handling
**Decision**: On 401 from `/auth/login` or `/auth/register`, return backend error message instead of auto-redirect.
**Rationale**:
- Backend returns specific messages (e.g., "Incorrect email or password")
- Auto-redirect with token clear is only for expired tokens on protected routes
- Prevents confusing UX when credentials are simply wrong

## 14. Notifications: Custom Toast System
**Decision**: Build lightweight toast system instead of react-hot-toast or similar.
**Rationale**:
- Zero dependencies beyond React
- Full control over styling (CSS variables), timing, animations
- ~2kb gzipped vs 5kb+ for libraries
- Portal-based rendering to body for proper stacking

## 15. Kanban vs List View
**Decision**: Primary view is Kanban board (4 columns); list view as alternative.
**Rationale**:
- Kanban matches job tracking mental model (status progression)
- Drag-and-drop is intuitive for status changes
- List view kept for dense viewing / filtering
- Both share JobCard component

## 16. Optimistic UI for Status Changes
**Decision**: Update UI immediately on drag-drop, revert on API error.
**Rationale**:
- Instant feedback feels faster
- Backend errors are rare; revert + toast handles edge cases
- Simpler than complex rollback logic

## 17. Optimistic UI for Status Changes
**Decision**: Update UI immediately on drag-drop, revert on API error.
**Rationale**:
- Instant feedback feels faster
- Backend errors are rare; revert + toast handles edge cases
- Simpler than complex rollback logic

## 18. Duplicate Submission Prevention
**Decision**: Disable submit buttons during pending requests via `isLoading` state.
**Rationale**:
- Prevents accidental double-clicks
- No need for request deduplication logic
- Visual feedback (spinner) indicates processing

## 19. Loading Skeletons over Spinners
**Decision**: Use shimmer skeleton cards for Kanban loading state.
**Rationale**:
- Perceived performance improvement
- Matches final layout (no layout shift)
- Better UX than full-page spinner

## 20. Job Search: Modal over Page
**Decision**: Open JobSearch in a modal from Dashboard, not a separate route.
**Rationale**:
- Keeps user context (kanban visible behind modal)
- Search is a supplementary action, not primary navigation
- Modal can be large (xl) for comfortable results viewing
- ESC key and overlay click dismiss naturally

## 21. Search Results: Cards with Inline Actions
**Decision**: Each result is a card with View, Copy Link, Track Job actions.
**Rationale**:
- All key info visible without drilling down
- Copy-to-clipboard uses native Clipboard API
- Track Job pre-fills POST /jobs with search result data
- Confirmation modal prevents accidental tracking

## 22. External Job Tracking: Pre-filled POST /jobs
**Decision**: "Track Job" creates application via POST /jobs with search result data.
**Rationale**:
- Uses existing API contract (no new endpoints)
- Notes field captures source, location, posted date for reference
- Status defaults to "applied" (first step in pipeline)
- User can edit immediately after tracking

## 23. Load More Pagination
**Decision**: "Load More" button instead of infinite scroll.
**Rationale**:
- Explicit user intent (no accidental requests)
- Works better with keyboard navigation
- Simpler to implement and test
- Clear visual indicator of more results

## 24. Copy to Clipboard: Native API + Visual Feedback
**Decision**: Use `navigator.clipboard.writeText()` with button state change.
**Rationale**:
- No external dependency
- Button shows "Copied!" for 2s then reverts
- Graceful fallback if Clipboard API unavailable
- Works in secure contexts (HTTPS/localhost)

## 25. Search Error Handling: Specific Messages per Failure Mode
**Decision**: Distinct user-facing messages for missing config, rate limit, timeout, network, empty.
**Rationale**:
- Missing JSEARCH_API_KEY → actionable hint for backend config
- Rate limit → wait guidance
- Timeout/network → retry suggestion
- Empty results → search refinement suggestion
- No raw technical details exposed to users

## 26. Sidebar as Primary Navigation
**Decision**: The sidebar is the primary navigation for all protected sections (Dashboard, Applications, Suggestions, Resume). Each is a separate route navigated via React Router's `NavLink`.
**Rationale**:
- Eliminates duplicate navigation (previously Dashboard had embedded tabs for Applications/Suggestions/Resume)
- Each section gets its own URL — bookmarkable, shareable, browser back/forward works
- `NavLink`'s built-in `isActive` prop handles active state automatically
- Matches user expectation of "each major section = its own page"
- No state management needed for navigation — React Router handles it

## 27. Logout via React Router (Not window.location)
**Decision**: Use `useNavigate()` from React Router for logout navigation, not `window.location.href`.
**Rationale**:
- Preserves React Router state and history
- Avoids full page reload (faster, smoother UX)
- Consistent with the rest of the app's navigation
- `window.location` is reserved for cases that truly require a full reload (e.g., after auth state corruption)

## 28. Mobile Sidebar: Slide-Out with Overlay
**Decision**: On screens < 1024px, the sidebar slides in from the left when the Header hamburger is clicked, with a semi-transparent overlay behind it.
**Rationale**:
- Standard mobile pattern users expect
- Overlay click or close button dismisses the menu
- Auto-closes on navigation (via `onNavigate` prop) so users don't have to manually close it
- Auto-closes on resize back to desktop (handled in `Layout` useEffect)

## 29. PDF Download via Blob + Object URL
**Decision**: The "Enhance PDF" feature uses axios with `responseType: 'blob'`, creates an Object URL, and triggers a programmatic `<a download>` click to save the PDF.
**Rationale**:
- No new dependencies (no `file-saver` or similar) — uses the native browser download mechanism
- Object URL is revoked immediately after click to avoid memory leaks
- Consistent with how the browser handles native downloads (shows in the downloads bar, respects "ask where to save" settings)
- Works in all modern browsers without pop-up blockers (programmatic clicks on same-origin elements are allowed)

## 30. Blob Error Handling for Binary Endpoints
**Decision**: For endpoints with `responseType: 'blob'`, error responses come back as JSON blobs (not parsed objects). The hook detects this by checking the blob's MIME type, and if it's JSON, parses it to extract the backend's `detail` message.
**Rationale**:
- axios's response interceptor normalizes errors assuming JSON, but with `responseType: 'blob'` the error body is left as a blob
- Without this handling, users would see a generic "An unexpected error occurred" instead of the actionable backend message (e.g., "No resume on file. Upload one first.")
- MIME-type detection is reliable because the backend sets `Content-Type` correctly for both success (application/pdf) and error (application/json) responses
- Keeps the axios interceptor generic — no special-casing needed for blob endpoints at the interceptor level

## 31. Feature-Flag + Isolated-Module Pattern for New Features
**Decision**: All new features live in `src/features/{name}/` (own types, API, hook, components, README), gated by a single boolean in `src/config/features.ts`. Wire-up touches outside the feature directory are guarded by `isFeatureEnabled(name)`.
**Rationale**:
- A single boolean lets us kill a feature at runtime without code deletion (flip the flag, app behaves as if the feature never existed)
- The feature directory contains every line of feature code, so removal is `rm -rf` + revert the 5-7 guarded wire-up lines
- The README at `Job_Tracker/features/{name}/README.md` is the contract for both frontend and backend teams — backend reads it for the API spec, frontend reads it for the data model
- Existing code (job search, resume, suggestions) does NOT need to be refactored into this pattern — works as-is, pattern is forward-looking
- See `features/profile/README.md` for the canonical example

## 32. Force Onboarding Until Profile Complete
**Decision**: After register (and on login with no profile), the user is redirected to `/onboarding` and cannot access the rest of the app until their profile is complete (all four required fields filled).
**Rationale**:
- Personalized suggestions only work with a complete profile — letting users skip onboarding leads to a degraded Suggestions experience
- A `<ProfileGate>` route guard wraps the protected layout, so the redirect is automatic and applies to every page
- No infinite redirect: `/onboarding` is outside the gate, so completing the form navigates to `/dashboard` cleanly
- Existing users without a profile are caught by the same gate on login
- If the user closes the browser mid-onboarding, they pick up where they left off (their partial save is in the backend)

## 33. Extend /jobs/suggested with use_preferences Flag (Not Replace)
**Decision**: The `/jobs/suggested` endpoint accepts a new `use_preferences: bool = true` query param. When true AND profile is complete, the backend uses roles × locations cartesian product. When false OR no profile, it falls back to the existing resume-based query generation.
**Rationale**:
- No breaking change for existing users without a profile (resume-based path still works)
- The two modes are complementary, not competing — power users can switch via the URL param
- Backend deduplication (by job `link`) keeps the response size reasonable even with cartesian product (3 roles × 2 locations = 6 searches)
- Frontend sends `use_preferences=true` by default; the only reason to send `false` is debugging or A/B testing
- One endpoint, one cartesian loop, one dedup pass — simpler than maintaining a parallel `/suggested/preferences` endpoint

## 34. Server-Computes is_complete (Not Client)
**Decision**: The `is_complete` boolean on `UserProfile` is computed by the backend (`compute_is_complete()` in `app/schemas.py`) and returned on every read. The frontend uses it but never sets it.
**Rationale**:
- Single source of truth: if the rules for "complete" ever change (e.g. add a new required field), only the backend needs updating
- The frontend's `isProfileComplete()` helper in `validation.ts` mirrors the same logic for UX purposes (showing the "set preferences" CTA), but the actual gate decision is always based on the server response
- Avoids drift: client says "complete" but server says "incomplete" → gate still triggers onboarding (correct behavior)