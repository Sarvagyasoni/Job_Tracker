// Client-side validation. Mirrors backend rules in app/schemas.py.
// Used to surface field errors before the network call.
// See features/profile/README.md Section 3.4.

import type {
  EmploymentType,
  ExperienceLevel,
  UserProfile,
  UserProfileUpdate,
  WorkMode,
  YearsOfExperience,
} from './types';

export const MAX_ITEM_LENGTH = 25;
export const MAX_ITEMS = 10;
export const MAX_SKILLS = 30;
export const MAX_SKILL_LENGTH = 50;
export const MAX_NAME_LENGTH = 100;

export type ValidationErrors = Partial<Record<keyof UserProfileUpdate | 'form', string>>;

const ALLOWED_WORK_MODE: WorkMode[] = ['remote', 'hybrid', 'on_site', 'any'];
const ALLOWED_EMPLOYMENT: EmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
  'any',
];
const ALLOWED_EXPERIENCE: ExperienceLevel[] = [
  'internship',
  'entry_level',
  'junior',
  'mid',
  'senior',
  'lead',
  'any',
];
const ALLOWED_YEARS: YearsOfExperience[] = ['0', '1-2', '3-5', '6-10', '10+', 'any'];

function dedupeAndTrim(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function validateStringArray(
  value: string[] | undefined,
  opts: { required: boolean; maxItems: number; maxItemLength: number; label: string },
): string | null {
  if (value === undefined) return null;
  if (opts.required && value.length === 0) {
    return `${opts.label}: at least one entry is required`;
  }
  if (value.length > opts.maxItems) {
    return `${opts.label}: maximum ${opts.maxItems} entries allowed`;
  }
  const cleaned = dedupeAndTrim(value);
  if (opts.required && cleaned.length === 0) {
    return `${opts.label}: entries cannot be empty`;
  }
  if (cleaned.length !== value.length) {
    return `${opts.label}: duplicates and blank entries are not allowed`;
  }
  if (cleaned.some((s) => s.length > opts.maxItemLength)) {
    return `${opts.label}: each entry must be ${opts.maxItemLength} characters or fewer`;
  }
  return null;
}

export function validateProfile(payload: UserProfileUpdate): ValidationErrors {
  const errors: ValidationErrors = {};

  if (payload.first_name !== undefined) {
    const v = payload.first_name.trim();
    if (!v) errors.first_name = 'First name is required';
    else if (v.length > MAX_NAME_LENGTH) errors.first_name = `Max ${MAX_NAME_LENGTH} characters`;
  }

  if (payload.last_name !== undefined) {
    const v = payload.last_name.trim();
    if (!v) errors.last_name = 'Last name is required';
    else if (v.length > MAX_NAME_LENGTH) errors.last_name = `Max ${MAX_NAME_LENGTH} characters`;
  }

  if (payload.preferred_roles !== undefined) {
    const e = validateStringArray(payload.preferred_roles, {
      required: true,
      maxItems: MAX_ITEMS,
      maxItemLength: MAX_ITEM_LENGTH,
      label: 'Preferred roles',
    });
    if (e) errors.preferred_roles = e;
  }

  if (payload.preferred_locations !== undefined) {
    const e = validateStringArray(payload.preferred_locations, {
      required: true,
      maxItems: MAX_ITEMS,
      maxItemLength: MAX_ITEM_LENGTH,
      label: 'Preferred locations',
    });
    if (e) errors.preferred_locations = e;
  }

  if (payload.work_mode !== undefined) {
    const bad = payload.work_mode.find((v) => !ALLOWED_WORK_MODE.includes(v));
    if (bad) errors.work_mode = `Invalid work mode: ${bad}`;
    else if (new Set(payload.work_mode).size !== payload.work_mode.length) {
      errors.work_mode = 'Duplicate work modes are not allowed';
    }
  }

  if (payload.employment_type !== undefined) {
    const bad = payload.employment_type.find((v) => !ALLOWED_EMPLOYMENT.includes(v));
    if (bad) errors.employment_type = `Invalid employment type: ${bad}`;
    else if (new Set(payload.employment_type).size !== payload.employment_type.length) {
      errors.employment_type = 'Duplicate employment types are not allowed';
    }
  }

  if (payload.experience_level !== undefined && payload.experience_level !== null) {
    if (!ALLOWED_EXPERIENCE.includes(payload.experience_level)) {
      errors.experience_level = 'Invalid experience level';
    }
  }

  if (payload.years_of_experience !== undefined && payload.years_of_experience !== null) {
    if (!ALLOWED_YEARS.includes(payload.years_of_experience)) {
      errors.years_of_experience = 'Invalid years of experience';
    }
  }

  if (payload.skills !== undefined) {
    if (payload.skills.length > MAX_SKILLS) {
      errors.skills = `Maximum ${MAX_SKILLS} skills allowed`;
    } else {
      const cleaned = dedupeAndTrim(payload.skills);
      if (cleaned.some((s) => s.length > MAX_SKILL_LENGTH)) {
        errors.skills = `Each skill must be ${MAX_SKILL_LENGTH} characters or fewer`;
      } else if (cleaned.length !== payload.skills.length) {
        errors.skills = 'Duplicate or blank skills are not allowed';
      }
    }
  }

  if (payload.minimum_salary !== undefined && payload.minimum_salary !== null) {
    if (!payload.minimum_salary.amount || payload.minimum_salary.amount <= 0) {
      errors.minimum_salary = 'Salary amount must be positive';
    } else if (
      !payload.minimum_salary.currency ||
      payload.minimum_salary.currency.length !== 3
    ) {
      errors.minimum_salary = 'Currency must be a 3-letter code';
    }
  }

  return errors;
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return (
    profile.first_name.trim().length > 0 &&
    profile.last_name.trim().length > 0 &&
    profile.preferred_roles.length > 0 &&
    profile.preferred_locations.length > 0
  );
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
