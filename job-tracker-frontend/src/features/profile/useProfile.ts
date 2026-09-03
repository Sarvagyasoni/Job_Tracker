// Hook wrapping the profile API. Handles state, fetch, update, errors.

import { useCallback, useEffect, useRef, useState } from 'react';
import { profileApi } from './api';
import type { UserProfile, UserProfileUpdate } from './types';

export interface UseProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  notFound: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UserProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export function useProfile(options: { autoFetch?: boolean } = {}): UseProfileResult {
  const { autoFetch = true } = options;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const fetchedOnce = useRef(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await profileApi.get();
      setProfile(data);
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e.status === 404) {
        setNotFound(true);
        setProfile(null);
      } else {
        setError(e.message || 'Failed to load profile');
        setProfile(null);
      }
    } finally {
      setIsLoading(false);
      fetchedOnce.current = true;
    }
  }, []);

  const updateProfile = useCallback(
    async (data: UserProfileUpdate) => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await profileApi.update(data);
        setProfile(updated);
        return { success: true };
      } catch (err) {
        const e = err as { message?: string; fieldErrors?: Record<string, string> };
        const message = e.message || 'Failed to save profile';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (autoFetch && !fetchedOnce.current) {
      fetchProfile();
    }
  }, [autoFetch, fetchProfile]);

  return {
    profile,
    isLoading,
    isSaving,
    error,
    notFound,
    fetchProfile,
    updateProfile,
    clearError: () => setError(null),
  };
}

// Lightweight hook: returns just the user's first name (or null).
// Safe to use in many places without re-rendering on every profile field change.
export function useFirstName(): string | null {
  const [firstName, setFirstName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    profileApi
      .get()
      .then((data) => {
        if (!cancelled) setFirstName(data.first_name || null);
      })
      .catch(() => {
        if (!cancelled) setFirstName(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return firstName;
}
