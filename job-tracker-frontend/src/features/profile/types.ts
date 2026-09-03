// Frontend type contract for the profile feature.
// Must match app/schemas.py (UserProfile, UserProfileUpdate) on the backend.
// See features/profile/README.md Section 2.

export type WorkMode = 'remote' | 'hybrid' | 'on_site' | 'any';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'freelance'
  | 'any';

export type ExperienceLevel =
  | 'internship'
  | 'entry_level'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'any';

export type YearsOfExperience = '0' | '1-2' | '3-5' | '6-10' | '10+' | 'any';

export interface SalaryExpectation {
  amount: number;
  currency: string;
}

export interface UserProfile {
  first_name: string;
  last_name: string;
  preferred_roles: string[];
  preferred_locations: string[];
  work_mode: WorkMode[];
  employment_type: EmploymentType[];
  experience_level: ExperienceLevel | null;
  years_of_experience: YearsOfExperience | null;
  skills: string[];
  minimum_salary: SalaryExpectation | null;
  is_complete: boolean;
  updated_at: string | null;
}

export type UserProfileUpdate = Partial<{
  first_name: string;
  last_name: string;
  preferred_roles: string[];
  preferred_locations: string[];
  work_mode: WorkMode[];
  employment_type: EmploymentType[];
  experience_level: ExperienceLevel | null;
  years_of_experience: YearsOfExperience | null;
  skills: string[];
  minimum_salary: SalaryExpectation | null;
}>;

export const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on_site', label: 'On-site' },
  { value: 'any', label: 'Any' },
];

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'any', label: 'Any' },
];

export const EXPERIENCE_LEVEL_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'internship', label: 'Internship' },
  { value: 'entry_level', label: 'Entry Level' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'any', label: 'Any' },
];

export const YEARS_OPTIONS: { value: YearsOfExperience; label: string }[] = [
  { value: '0', label: '0 years' },
  { value: '1-2', label: '1-2 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '6-10', label: '6-10 years' },
  { value: '10+', label: '10+ years' },
  { value: 'any', label: 'Any' },
];

// Common suggestions shown in the role/location multi-select.
// Users can also type custom values that aren't in these lists.
export const SUGGESTED_ROLES: string[] = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Python Developer',
  'React Developer',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
  'Mobile Developer',
  'iOS Developer',
  'Android Developer',
  'QA Engineer',
  'Engineering Manager',
  'Product Manager',
  'UX Designer',
  'UI Designer',
];

export const SUGGESTED_LOCATIONS: string[] = [
  'Bangalore, India',
  'Hyderabad, India',
  'Pune, India',
  'Mumbai, India',
  'Delhi, India',
  'Chennai, India',
  'Remote',
  'New York, NY',
  'San Francisco, CA',
  'Seattle, WA',
  'Austin, TX',
  'London, UK',
  'Berlin, Germany',
  'Toronto, Canada',
  'Singapore',
  'Sydney, Australia',
];

export const CURRENCY_OPTIONS: string[] = [
  'USD',
  'INR',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'SGD',
  'JPY',
];
