import { useState, useCallback } from 'react';
import { jobsApi } from '../api';
import type { Job, JobCreate, JobUpdate, JobFilters, JobSearchResult, ApiError } from '../types';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (filters?: JobFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await jobsApi.list(filters);
      setJobs(response.data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createJob = useCallback(async (data: JobCreate) => {
    setError(null);
    try {
      const response = await jobsApi.create(data);
      setJobs((prev) => [response.data, ...prev]);
      return { success: true, job: response.data };
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create job');
      return { success: false, error: apiError.message, fieldErrors: apiError.fieldErrors };
    }
  }, []);

  const updateJob = useCallback(async (id: number, data: JobUpdate) => {
    setError(null);
    try {
      const response = await jobsApi.update(id, data);
      setJobs((prev) => prev.map((job) => (job.id === id ? response.data : job)));
      return { success: true, job: response.data };
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to update job');
      return { success: false, error: apiError.message, fieldErrors: apiError.fieldErrors };
    }
  }, []);

  const deleteJob = useCallback(async (id: number) => {
    setError(null);
    try {
      await jobsApi.delete(id);
      setJobs((prev) => prev.filter((job) => job.id !== id));
      return { success: true };
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete job');
      return { success: false, error: apiError.message };
    }
  }, []);

  return {
    jobs,
    isLoading,
    error,
    fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    clearError: () => setError(null),
  };
}

export function useJobSearch() {
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');

  const search = useCallback(async (searchQuery: string, pageNum = 1, remoteOnly = false) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await jobsApi.search(searchQuery, pageNum, remoteOnly);
      if (pageNum === 1) {
        setResults(response.data.results);
      } else {
        setResults((prev) => [...prev, ...response.data.results]);
      }
      setPage(pageNum);
      setQuery(searchQuery);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (query && !isLoading) {
      search(query, page + 1);
    }
  }, [query, page, isLoading, search]);

  return {
    results,
    isLoading,
    error,
    query,
    page,
    search,
    loadMore,
    clearError: () => setError(null),
    clearResults: () => setResults([]),
  };
}