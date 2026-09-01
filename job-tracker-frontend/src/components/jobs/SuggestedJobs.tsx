import { useState, useEffect, useCallback } from 'react';
import { Button } from '../common';
import { JobSearchResultCard } from './JobSearchResultCard';
import { useSuggestedJobs } from '../../hooks/useJobs';
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Suggested for You</h2>
          <p className={styles.subtitle}>
            AI-powered recommendations based on your resume
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
          {error.includes('404') && (
            <p className={styles.errorHint}>Upload a resume first to get personalized job suggestions.</p>
          )}
          {error.includes('JSEARCH_API_KEY') && (
            <p className={styles.errorHint}>Job search requires API configuration on the backend.</p>
          )}
        </div>
      )}

      {isLoading && page === 1 && !error && (
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {hasFetched && !isLoading && !error && results.length === 0 && (
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="8" x2="14" y2="14" />
          </svg>
          <h3>No suggestions yet</h3>
          <p>Upload your resume to get AI-powered job recommendations tailored to your experience.</p>
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