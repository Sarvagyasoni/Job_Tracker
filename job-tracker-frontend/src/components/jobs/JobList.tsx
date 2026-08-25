import { useState } from 'react';
import { Button, Select } from '../common';
import { JobCard } from './JobCard';
import type { Job, JobStatus, JobFilters } from '../../types';
import styles from './JobList.module.css';

interface JobListProps {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEdit: (job: Job) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: JobStatus) => void;
  onCreate: () => void;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

export function JobList({
  jobs,
  isLoading,
  error,
  onRefresh,
  onEdit,
  onDelete,
  onCreate,
}: JobListProps) {
  const [statusFilter, setStatusFilter] = useState<JobFilters['status'] | ''>('');

  const handleFilterChange = (value: string) => {
    setStatusFilter(value as JobStatus | '');
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <p>Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{error}</p>
        <Button variant="outline" onClick={onRefresh}>
          Try Again
        </Button>
      </div>
    );
  }

  const filteredJobs = jobs.filter((job) => !statusFilter || job.status === statusFilter);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Applications</h2>
          <p className={styles.subtitle}>
            {jobs.length} application{jobs.length !== 1 ? 's' : ''} total
            {statusFilter && ` • ${filteredJobs.length} showing`}
          </p>
        </div>
        <Button variant="primary" onClick={onCreate}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Application
        </Button>
      </div>

      <div className={styles.filterBar}>
        <Select
          label="Filter by status"
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="All Statuses"
        />
      </div>

      {filteredJobs.length === 0 ? (
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3>No applications yet</h3>
          <p>
            {statusFilter
              ? `No applications with status "${statusFilter}".`
              : 'Start tracking your job applications by adding your first one.'}
          </p>
          {!statusFilter && (
            <Button variant="primary" onClick={onCreate} className={styles.emptyButton}>
              Add Your First Application
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.grid} role="list" aria-label="Job applications">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isDragging={false}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}