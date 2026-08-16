import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import type { Job, JobStatus } from '../../types';
import styles from './KanbanBoard.module.css';

const STATUS_ORDER: JobStatus[] = ['applied', 'interviewing', 'offer', 'rejected'];
const STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

interface KanbanBoardProps {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEdit: (job: Job) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: JobStatus) => void;
  onCreate: () => void;
  onView?: (job: Job) => void;
}

export function KanbanBoard({
  jobs,
  isLoading,
  error,
  onRefresh,
  onEdit,
  onDelete,
  onStatusChange,
  onCreate,
  onView,
}: KanbanBoardProps) {
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const columns = useMemo(() => {
    const grouped = STATUS_ORDER.reduce(
      (acc, status) => {
        acc[status] = jobs.filter((job) => job.status === status);
        return acc;
      },
      {} as Record<JobStatus, Job[]>
    );
    return STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      jobs: grouped[status] || [],
    }));
  }, [jobs]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveJobId(Number(active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveJobId(null);

      if (!over) return;

      const jobId = Number(active.id);
      const newStatus = over.id as JobStatus;
      const currentJob = jobs.find((j) => j.id === jobId);

      if (currentJob && currentJob.status !== newStatus) {
        onStatusChange(jobId, newStatus);
      }
    },
    [jobs, onStatusChange]
  );

  if (isLoading && jobs.length === 0) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.skeletonColumn}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
        <div className={styles.skeletonColumn}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
        <div className={styles.skeletonColumn}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
        <div className={styles.skeletonColumn}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>{error}</p>
        <button onClick={onRefresh} className={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  const totalJobs = jobs.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Applications</h2>
          <p className={styles.subtitle}>{totalJobs} application{totalJobs !== 1 ? 's' : ''} tracked</p>
        </div>
        <button onClick={onCreate} className={styles.createButton}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Application
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.board} role="list" aria-label="Job applications by status">
          {columns.map(({ status, label, jobs: columnJobs }) => (
            <KanbanColumn
              key={status}
              status={status}
              label={label}
              jobs={columnJobs}
              activeJobId={activeJobId}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
        </div>
      </DndContext>

      {totalJobs === 0 && (
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3>No applications yet</h3>
          <p>Start tracking your job applications by adding your first one.</p>
          <button onClick={onCreate} className={styles.emptyButton}>
            Add Your First Application
          </button>
        </div>
      )}
    </div>
  );
}