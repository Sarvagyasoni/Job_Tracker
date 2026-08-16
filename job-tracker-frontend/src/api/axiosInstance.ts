import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function normalizeError(error: AxiosError): ApiError {
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
    };
  }

  const { status, data } = error.response;
  const responseData = data as Record<string, unknown> | undefined;

  if (status === 400 && responseData?.detail) {
    const fieldErrors: Record<string, string> = {};
    const details = responseData.detail as Array<{ loc?: (string | number)[]; msg?: string }> | undefined;
    if (Array.isArray(details)) {
      for (const err of details) {
        const field = err.loc?.[1] as string || 'form';
        fieldErrors[field] = err.msg || 'Invalid value';
      }
    }
    return {
      message: 'Please check your input',
      fieldErrors,
      status,
    };
  }

  if (status === 401) {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    return {
      message: 'Session expired. Please log in again.',
      status,
    };
  }

  if (status === 404) {
    return {
      message: (responseData?.detail as string) || 'Resource not found',
      status,
    };
  }

  if (status === 429) {
    return {
      message: 'Too many requests. Please wait a moment and try again.',
      status,
    };
  }

  if (status && status >= 500) {
    return {
      message: 'Server error. Please try again later.',
      status,
    };
  }

  return {
    message: (responseData?.detail as string) || 'An unexpected error occurred',
    status,
  };
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(normalizeError(error))
);

export default axiosInstance;