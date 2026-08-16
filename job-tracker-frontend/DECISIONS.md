# Job Application Tracker — Architecture Decisions

## 1. Framework: React + TypeScript + Vite
**Decision**: Use React 18 with TypeScript and Vite.
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

## 17. Duplicate Submission Prevention
**Decision**: Disable submit buttons during pending requests via `isLoading` state.
**Rationale**:
- Prevents accidental double-clicks
- No need for request deduplication logic
- Visual feedback (spinner) indicates processing

## 18. Loading Skeletons over Spinners
**Decision**: Use shimmer skeleton cards for Kanban loading state.
**Rationale**:
- Perceived performance improvement
- Matches final layout (no layout shift)
- Better UX than full-page spinner

## 19. Job Search: Modal over Page
**Decision**: Open JobSearch in a modal from Dashboard, not a separate route.
**Rationale**:
- Keeps user context (kanban visible behind modal)
- Search is a supplementary action, not primary navigation
- Modal can be large (xl) for comfortable results viewing
- ESC key and overlay click dismiss naturally

## 20. Search Results: Cards with Inline Actions
**Decision**: Each result is a card with View, Copy Link, Track Job actions.
**Rationale**:
- All key info visible without drilling down
- Copy-to-clipboard uses native Clipboard API
- Track Job pre-fills POST /jobs with search result data
- Confirmation modal prevents accidental tracking

## 21. External Job Tracking: Pre-filled POST /jobs
**Decision**: "Track Job" creates application via POST /jobs with search result data.
**Rationale**:
- Uses existing API contract (no new endpoints)
- Notes field captures source, location, posted date for reference
- Status defaults to "applied" (first step in pipeline)
- User can edit immediately after tracking

## 22. Load More Pagination
**Decision**: "Load More" button instead of infinite scroll.
**Rationale**:
- Explicit user intent (no accidental requests)
- Works better with keyboard navigation
- Simpler to implement and test
- Clear visual indicator of more results

## 23. Copy to Clipboard: Native API + Visual Feedback
**Decision**: Use `navigator.clipboard.writeText()` with button state change.
**Rationale**:
- No external dependency
- Button shows "Copied!" for 2s then reverts
- Graceful fallback if Clipboard API unavailable
- Works in secure contexts (HTTPS/localhost)

## 24. Search Error Handling: Specific Messages per Failure Mode
**Decision**: Distinct user-facing messages for missing config, rate limit, timeout, network, empty.
**Rationale**:
- Missing JSEARCH_API_KEY → actionable hint for backend config
- Rate limit → wait guidance
- Timeout/network → retry suggestion
- Empty results → search refinement suggestion
- No raw technical details exposed to users