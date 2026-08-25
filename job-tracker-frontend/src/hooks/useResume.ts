import { useState, useCallback } from 'react';
import { resumeApi } from '../api';
import type { ResumeOut, ApiError } from '../types';

export function useResume() {
  const [resume, setResume] = useState<ResumeOut | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResume = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await resumeApi.get();
      setResume(response.data);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status !== 404) {
        setError(apiError.message || 'Failed to load resume');
      }
      setResume(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadResume = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await resumeApi.upload(file);
      setResume(response.data);
      return { success: true, resume: response.data };
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to upload resume');
      return { success: false, error: apiError.message, fieldErrors: apiError.fieldErrors };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteResume = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await resumeApi.delete();
      setResume(null);
      return { success: true };
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete resume');
      return { success: false, error: apiError.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getATSScore = useCallback(async (jobDescription: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await resumeApi.atsScore(jobDescription);
      return { success: true, data: response.data };
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to get ATS score');
      return { success: false, error: apiError.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const tailorBullets = useCallback(async (jobDescription: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await resumeApi.tailorBullets(jobDescription);
      return { success: true, data: response.data };
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to tailor bullets');
      return { success: false, error: apiError.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    resume,
    isLoading,
    error,
    fetchResume,
    uploadResume,
    deleteResume,
    getATSScore,
    tailorBullets,
    clearError: () => setError(null),
  };
}