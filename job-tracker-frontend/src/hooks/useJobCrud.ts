import { useCallback, useState } from 'react';
import { useJobs } from './useJobs';
import { useToast } from '../components/common';
import type { Job, JobCreate, JobUpdate, JobSearchResult, ApiError } from '../types';

export interface JobCrudHandlers {
  jobs: Job[];
  isSubmitting: boolean;
  editingJob: Job | null;
  deletingJobId: number | null;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
  isSearchOpen: boolean;
  openCreate: () => void;
  openEdit: (job: Job) => void;
  closeForm: () => void;
  openDelete: (id: number) => void;
  closeDelete: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  handleSubmit: (data: JobCreate | JobUpdate) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  handleTrackSearchResult: (result: JobSearchResult) => Promise<{ success: boolean; error?: string }>;
  confirmDelete: () => Promise<void>;
  handleStatusChange: (id: number, status: Job['status']) => Promise<void>;
}

export function useJobCrud(): JobCrudHandlers {
  const { fetchJobs, jobs, createJob, updateJob, deleteJob } = useJobs();
  const { toast } = useToast();

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (data: JobCreate | JobUpdate) => {
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
    },
    [editingJob, createJob, updateJob, toast]
  );

  const handleTrackSearchResult = useCallback(
    async (result: JobSearchResult) => {
      const jobData: JobCreate = {
        company: result.company,
        role: result.role,
        status: 'applied',
        date_applied: new Date().toISOString().split('T')[0],
        link: result.link || undefined,
        notes: result.notes
          ? `${result.notes}\n\nSource: ${result.source}${result.location ? ` | Location: ${result.location}` : ''}${result.posted_at ? ` | Posted: ${result.posted_at}` : ''}`
          : undefined,
      };

      try {
        const resultResponse = await createJob(jobData);
        if (resultResponse.success) {
          toast({
            type: 'success',
            title: 'Job tracked',
            message: `${result.role} at ${result.company} added to your applications`,
          });
        } else {
          toast({ type: 'error', title: 'Failed to track', message: resultResponse.error });
        }
        return resultResponse;
      } catch (err) {
        const error = err as ApiError;
        if (error.fieldErrors) {
          toast({ type: 'error', title: 'Validation error', message: Object.values(error.fieldErrors).join(', ') });
        } else {
          toast({ type: 'error', title: 'Failed to track', message: error.message || 'An unexpected error occurred' });
        }
        return { success: false, error: error.message };
      }
    },
    [createJob, toast]
  );

  const confirmDelete = useCallback(async () => {
    if (deletingJobId === null) return;
    try {
      await deleteJob(deletingJobId);
      toast({ type: 'success', title: 'Application deleted' });
    } catch (err) {
      const error = err as ApiError;
      toast({ type: 'error', title: 'Failed to delete', message: error.message });
    } finally {
      setIsDeleteOpen(false);
      setDeletingJobId(null);
    }
  }, [deletingJobId, deleteJob, toast]);

  const handleStatusChange = useCallback(
    async (id: number, status: Job['status']) => {
      try {
        await updateJob(id, { status });
      } catch (err) {
        const error = err as ApiError;
        toast({ type: 'error', title: 'Failed to update status', message: error.message });
        fetchJobs();
      }
    },
    [updateJob, fetchJobs, toast]
  );

  return {
    jobs,
    isSubmitting,
    editingJob,
    deletingJobId,
    isFormOpen,
    isDeleteOpen,
    isSearchOpen,
    openCreate: () => {
      setEditingJob(null);
      setIsFormOpen(true);
    },
    openEdit: (job: Job) => {
      setEditingJob(job);
      setIsFormOpen(true);
    },
    closeForm: () => {
      setIsFormOpen(false);
      setEditingJob(null);
    },
    openDelete: (id: number) => {
      setDeletingJobId(id);
      setIsDeleteOpen(true);
    },
    closeDelete: () => {
      setIsDeleteOpen(false);
      setDeletingJobId(null);
    },
    openSearch: () => setIsSearchOpen(true),
    closeSearch: () => setIsSearchOpen(false),
    handleSubmit,
    handleTrackSearchResult,
    confirmDelete,
    handleStatusChange,
  };
}