# Job Application Tracker — Rollback Procedures

## Frontend Rollback

### Revert to Previous Commit
```bash
cd job-tracker-frontend
git log --oneline -10
git checkout <commit-hash> -- .
git commit -m "Rollback to <commit-hash>"
```

### Revert Specific File
```bash
git checkout <commit-hash> -- src/path/to/file.tsx
```

### Emergency: Disable Feature via Feature Flag
If a new feature breaks production, toggle it off in `src/utils/featureFlags.ts`:
```typescript
export const featureFlags = {
  jobSearch: false,  // Disable job search if API issues
  dragDrop: false,   // Disable drag-drop if buggy
};
```

## Backend Rollback (Reference Only - Requires Approval)

### Database Migration Rollback
```bash
cd job-tracker-backend
alembic downgrade -1  # Revert last migration
alembic downgrade <revision>  # Revert to specific revision
```

### Deploy Previous Backend Version
```bash
# On Render: Manual Deploy → Select previous successful deploy
# Or: git revert <bad-commit> && git push
```

### JWT Secret Rotation (Emergency)
If JWT secret compromised:
1. Generate new secret: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`
2. Update `JWT_SECRET` in Render environment variables
3. All users automatically logged out (tokens invalidated)
4. No frontend change needed

## Common Rollback Scenarios

### Scenario: New API Breaking Change
**Symptom**: Frontend errors after backend deploy
**Action**: 
1. Check backend changelog for breaking changes
2. If frontend not updated yet: rollback backend deploy
3. If frontend updated: fix frontend, deploy together

### Scenario: Frontend Build Fails
**Symptom**: `npm run build` errors in CI/CD
**Action**:
1. Revert commit that broke build
2. Or: fix build locally, push fix

### Scenario: Runtime Error in Production
**Symptom**: Error tracking shows spike (Sentry, etc.)
**Action**:
1. Identify commit introducing regression
2. `git revert <commit>` + deploy
3. Or: hotfix if trivial

### Scenario: CORS Error After Frontend Deploy
**Symptom**: Browser console shows CORS errors
**Action**:
1. Check `CORS_ORIGINS` in backend `.env` includes new frontend URL
2. Add URL, redeploy backend
3. Or: rollback frontend to previous URL

## Rollback Checklist
- [ ] Identify root cause
- [ ] Choose rollback strategy (git revert, deploy previous, feature flag)
- [ ] Execute rollback
- [ ] Verify fix in staging
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Document incident
- [ ] Plan proper fix for next deploy

## Communication
- Post in #deployments channel
- Tag @backend-team if backend-related
- Update status page if user-facing