export type JobStatus = 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface JobBase {
  company: string;
  role?: string | null;
  status: JobStatus;
  date_applied?: string | null;
  link?: string | null;
  notes?: string | null;
}

export interface JobCreate extends JobBase {}

export interface JobUpdate {
  company?: string | null;
  role?: string | null;
  status?: JobStatus | null;
  date_applied?: string | null;
  link?: string | null;
  notes?: string | null;
}

export interface Job extends JobBase {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface JobSearchResult {
  company: string;
  role: string;
  link?: string | null;
  notes?: string | null;
  location?: string | null;
  posted_at?: string | null;
  source: string;
}

export interface JobSearchResponse {
  query: string;
  page: number;
  results: JobSearchResult[];
}

export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface JobFilters {
  status?: JobStatus;
}

// ---------- Resume ----------
export interface ResumeOut {
  id: number;
  original_filename: string;
  uploaded_at: string;
}

export interface ATSScoreRequest {
  job_description: string;
}

export interface ATSScoreResponse {
  match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary: string;
}

export interface TailorBulletsRequest {
  job_description: string;
}

export interface TailorBulletsResponse {
  bullets: string[];
}