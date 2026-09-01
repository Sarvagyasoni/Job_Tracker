import { useDroppable } from '@dnd-kit/core';
import { JobCard } from './JobCard';
import type { Job, JobStatus } from '../../types';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  status: JobStatus;
  label: string;
  icon: React.ReactNode;
  jobs: Job[];
  activeJobId: number | null;
  onEdit: (job: Job) => void;
  onDelete: (id: number) => void;
  onView?: (job: Job) => void;
}

export function KanbanColumn({ status, label, icon, jobs, activeJobId, onEdit, onDelete, onView }: KanbanColumnProps) {
  const isActiveColumn = jobs.some((job) => job.id === activeJobId);

  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`${styles.column} ${isActiveColumn ? styles.active : ''} ${isOver ? styles.over : ''}`}
      aria-labelledby={`${status}-header`}
    >
      <header className={styles.header}>
        <h3 id={`${status}-header`} className={styles.title}>
          <span className={styles.titleIcon} aria-hidden="true">{icon}</span>
          <span className={styles.titleText}>{label}</span>
          <span className={styles.count}>{jobs.length}</span>
        </h3>
      </header>
      <div className={styles.dropZone} role="list" aria-label={`${label} applications`}>
        {jobs.length === 0 ? (
          <div className={styles.emptyDropZone}>
            <p>Drop here</p>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))
        )}
      </div>
    </section>
  );
}