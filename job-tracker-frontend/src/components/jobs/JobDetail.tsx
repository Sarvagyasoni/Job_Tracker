import { format } from 'date-fns';
import { Button } from '../common';
import type { Job } from '../../types';
import { JOB_STATUS_LABELS } from './jobStatus';
import styles from './JobDetail.module.css';

interface JobDetailProps {
  job: Job;
  onEdit: (job: Job) => void;
  onClose: () => void;
  statusClassName?: string;
}

export function JobDetail({ job, onEdit, onClose, statusClassName }: JobDetailProps) {
  const detailStatusClass = statusClassName ?? styles.detailStatus;

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <h3 className={styles.detailCompany}>{job.company}</h3>
        <span className={`${detailStatusClass} ${styles[`status-${job.status}`]}`}>
          {JOB_STATUS_LABELS[job.status]}
        </span>
      </div>

      {job.role && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Role</span>
          <span className={styles.detailValue}>{job.role}</span>
        </div>
      )}

      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Status</span>
        <span className={styles.detailValue}>{JOB_STATUS_LABELS[job.status]}</span>
      </div>

      {job.date_applied && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Date Applied</span>
          <span className={styles.detailValue}>{format(new Date(job.date_applied), 'MMMM d, yyyy')}</span>
        </div>
      )}

      {job.link && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Job Link</span>
          <a href={job.link} target="_blank" rel="noopener noreferrer" className={styles.detailLink}>
            View Posting
          </a>
        </div>
      )}

      {job.notes && (
        <div className={styles.detailSection}>
          <span className={styles.detailLabel}>Notes</span>
          <p className={styles.detailNotes}>{job.notes}</p>
        </div>
      )}

      <div className={styles.detailMeta}>
        <span>Created: {format(new Date(job.created_at), 'MMM d, yyyy')}</span>
        <span>Updated: {format(new Date(job.updated_at), 'MMM d, yyyy')}</span>
      </div>

      <div className={styles.detailActions}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={() => { onEdit(job); onClose(); }}>
          Edit
        </Button>
      </div>
    </div>
  );
}