import { useState, useCallback, useEffect } from 'react';
import { Button, Input, Select } from '../common';
import { JobSearchResultCard } from './JobSearchResultCard';
import { useJobSearch } from '../../hooks/useJobs';
import type { JobSearchResult } from '../../types';
import styles from './JobSearch.module.css';

interface JobSearchProps {
  onTrackJob: (result: JobSearchResult) => void;
  onClose?: () => void;
}

export function JobSearch({ onTrackJob, onClose }: JobSearchProps) {
  const { results, isLoading, error, query, search, loadMore, clearResults, clearError } = useJobSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    clearResults();
    await search(searchQuery, 1, remoteOnly);
    setHasSearched(true);
    setIsSearching(false);
  }, [searchQuery, remoteOnly, search, clearResults]);

  const handleLoadMore = useCallback(async () => {
    if (!isLoading && query) {
      await loadMore();
    }
  }, [isLoading, query, loadMore]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e as unknown as React.FormEvent);
    }
  }, [handleSearch]);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Discover Jobs</h2>
          <p className={styles.subtitle}>Search external job boards and track interesting opportunities</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close
          </Button>
        )}
      </header>

      <form onSubmit={handleSearch} className={styles.form} noValidate>
        <div className={styles.inputGroup}>
          <Input
            type="search"
            label="Job Search"
            placeholder="e.g., 'backend developer in Bangalore'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            required
            autoFocus
          />
          <Select
            label="Results per page"
            options={[
              { value: '10', label: '10 results' },
              { value: '20', label: '20 results' },
              { value: '50', label: '50 results' },
            ]}
            value="10"
            className={styles.pageSizeSelect}
          />
        </div>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>Remote only</span>
          </label>
        </div>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" isLoading={isSearching} disabled={!searchQuery.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          {hasSearched && (
            <Button type="button" variant="secondary" onClick={() => { setSearchQuery(''); clearResults(); setHasSearched(false); }}>
              Clear
            </Button>
          )}
        </div>
      </form>

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
        </div>
      )}

      {isLoading && !hasSearched && (
        <div className={styles.loading} role="status" aria-live="polite">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {hasSearched && !isLoading && !error && results.length === 0 && (
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="8" x2="14" y2="14" />
          </svg>
          <h3>No results found</h3>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className={styles.resultsHeader}>
            <p className={styles.resultsCount}>
              Showing {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
              {remoteOnly && ' (remote only)'}
            </p>
          </div>
          <div className={styles.resultsGrid} role="list" aria-label="Job search results">
            {results.map((result) => (
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