import { format } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../common';
import type { Job, JobStatus } from '../../types';
import styles from './JobCard.module.css';

const STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<JobStatus, string> = {
  applied: 'status-applied',
  interviewing: 'status-interviewing',
  offer: 'status-offer',
  rejected: 'status-rejected',
};

interface JobCardProps {
  job: Job;
  isDragging: boolean;
  onEdit: (job: Job) => void;
  onDelete: (id: number) => void;
  onView?: (job: Job) => void;
}

export function JobCard({ job, isDragging, onEdit, onDelete, onView }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: job.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging || isSortableDragging ? styles.dragging : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners} aria-label="Drag to reorder">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="5 9 3 9 3 15 5 15" />
          <polyline points="19 9 21 9 21 15 19 15" />
          <line x1="9" y1="5" x2="9" y2="19" />
          <line x1="15" y1="5" x2="15" y2="19" />
        </svg>
      </div>

      <div className={styles.header}>
        <div>
          <h3 className={styles.company}>{job.company}</h3>
          {job.role && <p className={styles.role}>{job.role}</p>}
        </div>
        <span className={`${styles.statusBadge} ${STATUS_COLORS[job.status]}`}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      <div className={styles.details}>
        {job.date_applied && (
          <div className={styles.detail}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Applied: {format(new Date(job.date_applied), 'MMM d, yyyy')}</span>
          </div>
        )}
        {job.link && (
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.detail}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>View posting</span>
          </a>
        )}
      </div>

      {job.notes && (
        <div className={styles.notes}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p>{job.notes}</p>
        </div>
      )}

      <div className={styles.actions}>
        {onView && (
          <Button variant="ghost" size="sm" onClick={() => onView(job)}>
            View
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onEdit(job)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(job.id)}>
          Delete
        </Button>
      </div>
    </article>
  );
}