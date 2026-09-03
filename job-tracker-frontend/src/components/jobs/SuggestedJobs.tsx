import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../common';
import { JobSearchResultCard } from './JobSearchResultCard';
import { useSuggestedJobs } from '../../hooks/useJobs';
import { useProfile } from '../../features/profile';
import { isFeatureEnabled } from '../../config/features';
import type { JobSearchResult } from '../../types';
import styles from './SuggestedJobs.module.css';

interface SuggestedJobsProps {
  onTrackJob: (result: JobSearchResult) => void;
}

export function SuggestedJobs({ onTrackJob }: SuggestedJobsProps) {
  const {
    results,
    generatedQuery,
    isLoading,
    error,
    page,
    fetchSuggested,
    loadMore,
    clearError,
  } = useSuggestedJobs();

  const profileEnabled = isFeatureEnabled('profile');
  const { profile } = useProfile({ autoFetch: profileEnabled });
  const isPreferencesMode = profileEnabled && profile?.is_complete === true;

  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (!hasFetched) {
      fetchSuggested(1);
      setHasFetched(true);
    }
  }, [fetchSuggested, hasFetched]);

  const handleRefresh = useCallback(async () => {
    await fetchSuggested(1);
  }, [fetchSuggested]);

  const handleLoadMore = useCallback(async () => {
    if (!isLoading) {
      await loadMore();
    }
  }, [isLoading, loadMore]);

  const isProfileMissing = profileEnabled && profile !== null && !profile.is_complete;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Suggested for You</h2>
          <p className={styles.subtitle}>
            {isPreferencesMode
              ? 'Personalized recommendations based on your job preferences'
              : 'AI-powered recommendations based on your resume'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} isLoading={isLoading && page === 1}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </Button>
      </header>

      {isPreferencesMode && profile && (
        <div className={styles.contextBar}>
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Roles:</span>
            {profile.preferred_roles.map((r) => (
              <span key={r} className={styles.contextChip}>{r}</span>
            ))}
          </div>
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Locations:</span>
            {profile.preferred_locations.map((l) => (
              <span key={l} className={styles.contextChip}>{l}</span>
            ))}
          </div>
          <Link to="/profile" className={styles.editLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Preferences
          </Link>
        </div>
      )}

      {generatedQuery && (
        <div className={styles.generatedQuery}>
          <span className={styles.queryLabel}>Generated search:</span>
          <span className={styles.queryValue}>&ldquo;{generatedQuery}&rdquo;</span>
        </div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          {error.includes('JSEARCH_API_KEY') && (
            <p className={styles.errorHint}>Job search requires API configuration on the backend.</p>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh}>Try Again</Button>
        </div>
      )}

      {isLoading && page === 1 && !error && (
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {isProfileMissing && hasFetched && !isLoading && results.length === 0 && !error && (
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h3>Set your job preferences to get personalized recommendations</h3>
          <p>Tell us what roles and locations you're looking for, and we'll find matching jobs for you.</p>
          <Link to="/profile">
            <Button variant="primary">Set Preferences</Button>
          </Link>
        </div>
      )}

      {hasFetched && !isLoading && !error && results.length === 0 && !isProfileMissing && (
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="8" x2="14" y2="14" />
          </svg>
          <h3>No matching jobs found</h3>
          <p>
            {isPreferencesMode
              ? "We couldn't find jobs matching your current preferences. Try broadening your locations or adding more roles."
              : 'Upload your resume to get AI-powered job recommendations tailored to your experience.'}
          </p>
          {isPreferencesMode && (
            <div className={styles.emptyActions}>
              <Link to="/profile">
                <Button variant="primary" size="sm">Edit Preferences</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className={styles.resultsHeader}>
            <p className={styles.resultsCount}>
              Showing {results.length} suggestion{results.length !== 1 ? 's' : ''}
              {generatedQuery && ` for &ldquo;{generatedQuery}&rdquo;`}
            </p>
          </div>
          <div className={styles.resultsGrid} role="list" aria-label="Suggested jobs">
            {results.map((result: JobSearchResult) => (
              <JobSearchResultCard
                key={`${result.company}-${result.role}-${result.link || result.posted_at || result.source}`}
                result={result}
                onTrack={onTrackJob}
              />
            ))}
          </div>
          <div className={styles.loadMore}>
            <Button variant="outline" onClick={handleLoadMore} isLoading={isLoading} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
