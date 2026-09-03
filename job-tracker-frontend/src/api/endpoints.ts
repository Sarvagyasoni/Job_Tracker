import axiosInstance from './axiosInstance';
import type {
  User,
  Token,
  Job,
  JobCreate,
  JobUpdate,
  JobSearchResponse,
  JobFilters,
  LoginCredentials,
  RegisterData,
  ResumeOut,
  ATSScoreResponse,
  TailorBulletsResponse,
  SuggestedJobsResponse,
} from '../types';

export const authApi = {
  register: (data: RegisterData) =>
    axiosInstance.post<User>('/auth/register', data),

  login: (credentials: LoginCredentials) =>
    axiosInstance.post<Token>('/auth/login', credentials),
};

export const jobsApi = {
  list: (filters?: JobFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    return axiosInstance.get<Job[]>('/jobs', { params });
  },

  get: (id: number) =>
    axiosInstance.get<Job>(`/jobs/${id}`),

  create: (data: JobCreate) =>
    axiosInstance.post<Job>('/jobs', data),

  update: (id: number, data: JobUpdate) =>
    axiosInstance.put<Job>(`/jobs/${id}`, data),

  delete: (id: number) =>
    axiosInstance.delete(`/jobs/${id}`),

  search: (query: string, page = 1, remoteOnly = false) => {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      remote_only: remoteOnly.toString(),
    });
    return axiosInstance.get<JobSearchResponse>(`/jobs/search?${params}`);
  },

  suggested: (page = 1, usePreferences = true) => {
    const params = new URLSearchParams({
      page: page.toString(),
      use_preferences: usePreferences.toString(),
    });
    return axiosInstance.get<SuggestedJobsResponse>(`/jobs/suggested?${params}`);
  },
};

export const resumeApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post<ResumeOut>('/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  get: () =>
    axiosInstance.get<ResumeOut>('/resume'),

  delete: () =>
    axiosInstance.delete('/resume'),

  atsScore: (jobDescription: string) =>
    axiosInstance.post<ATSScoreResponse>('/resume/ats-score', { job_description: jobDescription }),

  tailorBullets: (jobDescription: string) =>
    axiosInstance.post<TailorBulletsResponse>('/resume/tailor-bullets', {
      job_description: jobDescription,
    }),

  enhance: (jobDescription: string) =>
    axiosInstance.post('/resume/enhance', { job_description: jobDescription }, {
      responseType: 'blob',
      // Bumped from the global 15s default - this endpoint runs a full
      // Gemini generation (EnhancedResumeContent schema, 8192 max tokens) plus
      // a reportlab PDF render, which routinely takes 20-30s. The global
      // 15s default would otherwise kill the connection before the backend
      // has a chance to respond. See BACKEND_ISSUES_REPORT.md Item 1.
      timeout: 60000,
    }),
};