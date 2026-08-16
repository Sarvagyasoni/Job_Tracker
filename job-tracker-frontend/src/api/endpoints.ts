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