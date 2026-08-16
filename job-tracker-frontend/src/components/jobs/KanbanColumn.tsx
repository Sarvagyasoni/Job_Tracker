import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { JobCard } from './JobCard';
import type { Job, JobStatus } from '../../types';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  status: JobStatus;
  label: string;
  jobs: Job[];
  activeJobId: number | null;
  onEdit: (job: Job) => void;
  onDelete: (id: number) => void;
  onView?: (job: Job) => void;
}

export function KanbanColumn({ status, label, jobs, activeJobId, onEdit, onDelete, onView }: KanbanColumnProps) {
  const isActiveColumn = jobs.some((job) => job.id === activeJobId);

  return (
    <section className={`${styles.column} ${isActiveColumn ? styles.active : ''}`} aria-labelledby={`${status}-header`}>
      <header className={styles.header}>
        <h3 id={`${status}-header`} className={styles.title}>
          {label}
          <span className={styles.count}>{jobs.length}</span>
        </h3>
      </header>
      <SortableContext
        items={jobs.map((job) => job.id.toString())}
        strategy={verticalListSortingStrategy}
      >
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
                isDragging={job.id === activeJobId}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}