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
};