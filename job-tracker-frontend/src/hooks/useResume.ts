import { useState, useCallback } from 'react';
import axios from 'axios';
import { resumeApi } from '../api';
import type { ResumeOut, ApiError } from '../types';

async function extractErrorFromBlob(err: unknown): Promise<string | null> {
  // The enhance endpoint uses responseType: 'blob', so error responses come
  // back as JSON blobs rather than parsed objects. Reach into the raw axios
  // error to parse the blob and surface the backend's detail message.
  if (!axios.isAxiosError(err)) return null;
  const responseData = err.response?.data;
  if (responseData instanceof Blob) {
    const text = await responseData.text();
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      return parsed.detail || null;
    } catch {
      return null;
    }
  }
  return null;
}

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

  const enhanceResume = useCallback(async (jobDescription: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await resumeApi.enhance(jobDescription);
      const blob = response.data as Blob;

      // Some non-2xx responses may still be delivered as a JSON blob before
      // axios raises (e.g. if a proxy returns 200 with an error body). Guard
      // against that by checking the MIME type and surfacing the detail.
      if (blob.type === 'application/json' || blob.type === 'text/json') {
        const text = await blob.text();
        const parsed = JSON.parse(text) as { detail?: string };
        const message = parsed.detail || 'Failed to generate enhanced resume.';
        setError(message);
        return { success: false, error: message };
      }

      // Success: trigger a browser download of the PDF.
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'enhanced_resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (err) {
      const detail = await extractErrorFromBlob(err);
      const apiError = err as ApiError;
      const message = detail || apiError.message || 'Failed to generate enhanced resume.';
      setError(message);
      return { success: false, error: message };
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
    enhanceResume,
    clearError: () => setError(null),
  };
}