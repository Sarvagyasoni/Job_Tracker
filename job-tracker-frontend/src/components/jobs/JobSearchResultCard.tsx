import { useState } from 'react';
import { Button, Modal } from '../common';
import { format, parseISO } from 'date-fns';
import type { JobSearchResult } from '../../types';
import styles from './JobSearchResultCard.module.css';

interface JobSearchResultCardProps {
  result: JobSearchResult;
  onTrack: (result: JobSearchResult) => void;
}

export function JobSearchResultCard({ result, onTrack }: JobSearchResultCardProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTrack = async () => {
    setShowConfirm(true);
  };

  const confirmTrack = async () => {
    setIsTracking(true);
    try {
      await onTrack(result);
    } finally {
      setIsTracking(false);
      setShowConfirm(false);
    }
  };

  const copyLink = async () => {
    if (result.link) {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.companyInfo}>
          <h3 className={styles.company}>{result.company}</h3>
          <p className={styles.role}>{result.role}</p>
        </div>
        <span className={`${styles.sourceBadge} ${styles[`source-${result.source.toLowerCase()}`]}`}>
          {result.source}
        </span>
      </header>

      <div className={styles.details}>
        {result.location && (
          <div className={styles.detail}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{result.location}</span>
          </div>
        )}
        {formatDate(result.posted_at) && (
          <div className={styles.detail}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Posted: {formatDate(result.posted_at)}</span>
          </div>
        )}
        {result.link && (
          <div className={styles.detail}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <a href={result.link} target="_blank" rel="noopener noreferrer" className={styles.jobLink}>
              View original posting
            </a>
          </div>
        )}
      </div>

      {result.notes && (
        <div className={styles.snippet}>
          <p>{result.notes}</p>
        </div>
      )}

      <footer className={styles.footer}>
        <Button
          variant="outline"
          size="sm"
          onClick={copyLink}
          disabled={!result.link}
          aria-label={copied ? 'Copied!' : 'Copy job link'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {copied ? (
              <path d="M20 6L9 17l-5-5" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
          <span>{copied ? 'Copied!' : 'Copy link'}</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleTrack}
          isLoading={isTracking}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            <polyline points="17 21 17 13 7 13 7 3" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          Track Job
        </Button>
      </footer>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Track this job?"
        size="sm"
      >
        <div className={styles.confirmContent}>
          <p>Add &ldquo;<strong>{result.role}</strong>&rdquo; at <strong>{result.company}</strong> to your tracked applications?</p>
          <p className={styles.confirmNote}>This will create a new application with the job details pre-filled. You can edit before saving.</p>
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmTrack} isLoading={isTracking}>
              Yes, Track It
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
}