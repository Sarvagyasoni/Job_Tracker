import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../auth';
import { useJobs } from '../hooks';
import { Button, Modal, useToast } from '../components/common';
import { KanbanBoard, JobForm, JobSearch, ResumeManager } from '../components/jobs';
import type { Job, JobCreate, JobUpdate, JobSearchResult } from '../types';
import { format } from 'date-fns';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { jobs, isLoading, error, fetchJobs, createJob, updateJob, deleteJob } = useJobs();
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<'jobs' | 'resume'>('jobs');

  const handleCreate = useCallback(async (data: JobCreate | JobUpdate) => {
    setIsSubmitting(true);
    try {
      const result = editingJob
        ? await updateJob(editingJob.id, data as JobUpdate)
        : await createJob(data as JobCreate);
      if (result.success) {
        toast({ type: 'success', title: editingJob ? 'Application updated' : 'Application created' });
        setIsFormOpen(false);
        setEditingJob(null);
      } else {
        toast({ type: 'error', title: 'Failed', message: result.error });
      }
      return result;
    } catch {
      toast({ type: 'error', title: 'Error', message: 'An unexpected error occurred' });
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsSubmitting(false);
    }
  }, [editingJob, createJob, updateJob, toast]);

  const handleTrackSearchResult = useCallback(async (result: JobSearchResult) => {
    const jobData: JobCreate = {
      company: result.company,
      role: result.role,
      status: 'applied',
      date_applied: new Date().toISOString().split('T')[0],
      link: result.link || undefined,
      notes: result.notes ? `${result.notes}\n\nSource: ${result.source}${result.location ? ` | Location: ${result.location}` : ''}${result.posted_at ? ` | Posted: ${result.posted_at}` : ''}` : undefined,
    };

    try {
      const resultResponse = await createJob(jobData);
      if (resultResponse.success) {
        toast({ type: 'success', title: 'Job tracked', message: `${result.role} at ${result.company} added to your applications` });
      } else {
        toast({ type: 'error', title: 'Failed to track', message: resultResponse.error });
      }
      return resultResponse;
    } catch (err) {
      const error = err as { message?: string; fieldErrors?: Record<string, string> };
      if (error.fieldErrors) {
        toast({ type: 'error', title: 'Validation error', message: Object.values(error.fieldErrors).join(', ') });
      } else {
        toast({ type: 'error', title: 'Failed to track', message: error.message || 'An unexpected error occurred' });
      }
      return { success: false, error: error.message };
    }
  }, [createJob, toast]);

  const handleEdit = useCallback((job: Job) => {
    setEditingJob(job);
    setIsFormOpen(true);
  }, []);

  const handleView = useCallback((job: Job) => {
    setViewingJob(job);
    setIsViewOpen(true);
  }, []);

  const handleDelete = useCallback((id: number) => {
    setDeletingJobId(id);
    setIsDeleteOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deletingJobId === null) return;
    try {
      await deleteJob(deletingJobId);
      toast({ type: 'success', title: 'Application deleted' });
    } catch (err) {
      const error = err as { message?: string };
      toast({ type: 'error', title: 'Failed to delete', message: error.message });
    } finally {
      setIsDeleteOpen(false);
      setDeletingJobId(null);
    }
  }, [deletingJobId, deleteJob, toast]);

  const handleStatusChange = useCallback(async (id: number, status: Job['status']) => {
    try {
      await updateJob(id, { status });
    } catch (err) {
      const error = err as { message?: string };
      toast({ type: 'error', title: 'Failed to update status', message: error.message });
      fetchJobs();
    }
  }, [updateJob, fetchJobs, toast]);

  const openCreateForm = useCallback(() => {
    setEditingJob(null);
    setIsFormOpen(true);
  }, []);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.email || 'User'}</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={openSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Discover Jobs
          </Button>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <div className={styles.viewTabs}>
        <button
          className={`${styles.viewTab} ${activeView === 'jobs' ? styles.active : ''}`}
          onClick={() => setActiveView('jobs')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Applications
        </button>
        <button
          className={`${styles.viewTab} ${activeView === 'resume' ? styles.active : ''}`}
          onClick={() => setActiveView('resume')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Resume
        </button>
      </div>

      {activeView === 'jobs' && (
        <KanbanBoard
          jobs={jobs}
          isLoading={isLoading || authLoading}
          error={error}
          onRefresh={fetchJobs}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onCreate={openCreateForm}
          onView={handleView}
        />
      )}

      {activeView === 'resume' && (
        <ResumeManager />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingJob(null);
        }}
        title={editingJob ? 'Edit Application' : 'New Application'}
        size="lg"
      >
        <JobForm
          initialData={editingJob}
          onSubmit={handleCreate}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingJob(null);
          }}
          isLoading={isSubmitting}
        />
      </Modal>

      <Modal
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setViewingJob(null);
        }}
        title="Application Details"
        size="lg"
      >
        {viewingJob && <JobDetail job={viewingJob} onEdit={handleEdit} onClose={() => setIsViewOpen(false)} />}
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingJobId(null);
        }}
        title="Delete Application"
        size="sm"
      >
        <div className={styles.deleteConfirm}>
          <p>Are you sure you want to delete this application? This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <Button variant="secondary" onClick={() => { setIsDeleteOpen(false); setDeletingJobId(null); }}>
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
        onClose={() => setIsSearchOpen(false)}
        title="Discover Jobs"
        size="xl"
      >
        <JobSearch onTrackJob={handleTrackSearchResult} onClose={() => setIsSearchOpen(false)} />
      </Modal>
    </div>
  );
}

function JobDetail({ job, onEdit, onClose }: { job: Job; onEdit: (job: Job) => void; onClose: () => void }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <h3 className={styles.detailCompany}>{job.company}</h3>
        <span className={`${styles.detailStatus} status-${job.status}`}>{job.status}</span>
      </div>

      {job.role && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Role</span>
          <span className={styles.detailValue}>{job.role}</span>
        </div>
      )}

      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Status</span>
        <span className={styles.detailValue}>{job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
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