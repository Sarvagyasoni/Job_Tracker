import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../auth';
import { useJobs, useJobCrud } from '../hooks';
import { Button, Modal } from '../components/common';
import { KanbanBoard, JobForm, JobSearch, JobDetail } from '../components/jobs';
import type { Job } from '../types';
import styles from './JobsList.module.css';

export function Applications() {
  const { isLoading: authLoading } = useAuth();
  const { jobs, isLoading, error, fetchJobs } = useJobs();
  const {
    isSubmitting,
    editingJob,
    isFormOpen,
    isDeleteOpen,
    isSearchOpen,
    openCreate,
    openEdit,
    closeForm,
    openDelete,
    closeDelete,
    openSearch,
    closeSearch,
    handleSubmit,
    handleTrackSearchResult,
    confirmDelete,
    handleStatusChange,
  } = useJobCrud();

  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleView = useCallback((job: Job) => {
    setViewingJob(job);
    setIsViewOpen(true);
  }, []);

  const closeView = () => {
    setIsViewOpen(false);
    setViewingJob(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Applications</h1>
          <p>Manage all your job applications</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={openSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Discover Jobs
          </Button>
        </div>
      </header>

      <KanbanBoard
        jobs={jobs}
        isLoading={isLoading || authLoading}
        error={error}
        onRefresh={fetchJobs}
        onEdit={openEdit}
        onDelete={openDelete}
        onStatusChange={handleStatusChange}
        onCreate={openCreate}
        onView={handleView}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingJob ? 'Edit Application' : 'New Application'}
        size="lg"
      >
        <JobForm
          initialData={editingJob}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isLoading={isSubmitting}
        />
      </Modal>

      <Modal
        isOpen={isViewOpen}
        onClose={closeView}
        title="Application Details"
        size="lg"
      >
        {viewingJob && <JobDetail job={viewingJob} onEdit={(j) => { closeView(); openEdit(j); }} onClose={closeView} />}
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        title="Delete Application"
        size="sm"
      >
        <div className={styles.deleteConfirm}>
          <p>Are you sure you want to delete this application? This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <Button variant="secondary" onClick={closeDelete}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isSubmitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSearchOpen}
        onClose={closeSearch}
        title="Discover Jobs"
        size="xl"
      >
        <JobSearch onTrackJob={handleTrackSearchResult} onClose={closeSearch} />
      </Modal>
    </div>
  );
}