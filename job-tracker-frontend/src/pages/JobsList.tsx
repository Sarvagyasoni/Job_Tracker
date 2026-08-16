import { useState, useCallback } from 'react';
import { useAuth } from '../auth';
import { useJobs } from '../hooks';
import { Button, Modal, useToast } from '../components/common';
import { JobList, JobForm, JobSearch } from '../components/jobs';
import type { Job, JobCreate, JobUpdate, JobSearchResult } from '../types';
import styles from './JobsList.module.css';

export function JobsList() {
  const { logout, isLoading: authLoading } = useAuth();
  const { jobs, isLoading, error, fetchJobs, createJob, updateJob, deleteJob } = useJobs();
  const { toast } = useToast();

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <JobList
        jobs={jobs}
        isLoading={isLoading || authLoading}
        error={error}
        onRefresh={fetchJobs}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onCreate={openCreateForm}
      />

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