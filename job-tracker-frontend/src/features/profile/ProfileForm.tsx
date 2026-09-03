// The profile form. Two steps in onboarding mode (About You + Job Preferences),
// single step in edit mode (all fields). Used by both ProfilePage and ProfileOnboarding.

import { useEffect, useState } from 'react';
import { Button, Input, Select } from '../../components/common';
import { useToast } from '../../components/common';
import { MultiSelect } from './MultiSelect';
import { SkillChips } from './SkillChips';
import {
  CURRENCY_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  SUGGESTED_LOCATIONS,
  SUGGESTED_ROLES,
  WORK_MODE_OPTIONS,
  YEARS_OPTIONS,
} from './types';
import type {
  EmploymentType,
  ExperienceLevel,
  UserProfile,
  UserProfileUpdate,
  WorkMode,
  YearsOfExperience,
} from './types';
import {
  MAX_ITEM_LENGTH,
  MAX_ITEMS,
  MAX_NAME_LENGTH,
  MAX_SKILL_LENGTH,
  MAX_SKILLS,
  hasErrors,
  validateProfile,
  type ValidationErrors,
} from './validation';
import styles from './ProfileForm.module.css';

export interface ProfileFormProps {
  initialProfile: UserProfile | null;
  isSaving: boolean;
  onSubmit: (data: UserProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  mode: 'onboarding' | 'edit';
  onCancel?: () => void;
}

function profileToForm(p: UserProfile | null): UserProfileUpdate {
  return {
    first_name: p?.first_name ?? '',
    last_name: p?.last_name ?? '',
    preferred_roles: p?.preferred_roles ?? [],
    preferred_locations: p?.preferred_locations ?? [],
    work_mode: p?.work_mode ?? [],
    employment_type: p?.employment_type ?? [],
    experience_level: p?.experience_level ?? null,
    years_of_experience: p?.years_of_experience ?? null,
    skills: p?.skills ?? [],
    minimum_salary: p?.minimum_salary ?? null,
  };
}

export function ProfileForm({ initialProfile, isSaving, onSubmit, mode, onCancel }: ProfileFormProps) {
  const [form, setForm] = useState<UserProfileUpdate>(() => profileToForm(initialProfile));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [salaryEnabled, setSalaryEnabled] = useState<boolean>(
    initialProfile?.minimum_salary != null,
  );
  const [step, setStep] = useState<1 | 2>(1);
  const { toast } = useToast();

  useEffect(() => {
    setForm(profileToForm(initialProfile));
    setSalaryEnabled(initialProfile?.minimum_salary != null);
  }, [initialProfile]);

  const set = <K extends keyof UserProfileUpdate>(key: K, value: UserProfileUpdate[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validateStep1 = (): boolean => {
    const step1Errors = validateProfile({
      first_name: form.first_name,
      last_name: form.last_name,
    });
    setErrors(step1Errors);
    return !hasErrors(step1Errors);
  };

  const validateStep2 = (): boolean => {
    const allErrors = validateProfile(form);
    setErrors(allErrors);
    return !hasErrors(allErrors);
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      const firstError = Object.values(errors)[0];
      if (firstError) toast({ type: 'error', title: 'Please fix the errors', message: firstError });
      return;
    }

    // Strip empty optional fields so backend doesn't reject them
    const payload: UserProfileUpdate = {
      first_name: form.first_name?.trim(),
      last_name: form.last_name?.trim(),
      preferred_roles: form.preferred_roles ?? [],
      preferred_locations: form.preferred_locations ?? [],
      work_mode: form.work_mode ?? [],
      employment_type: form.employment_type ?? [],
      experience_level: form.experience_level ?? null,
      years_of_experience: form.years_of_experience ?? null,
      skills: form.skills ?? [],
      minimum_salary: salaryEnabled ? form.minimum_salary ?? null : null,
    };

    const result = await onSubmit(payload);
    if (!result.success && result.error) {
      toast({ type: 'error', title: 'Save failed', message: result.error });
    } else {
      toast({
        type: 'success',
        title: mode === 'onboarding' ? "You're all set" : 'Preferences updated',
        message: mode === 'onboarding'
          ? "We'll use your preferences to personalize job recommendations."
          : 'Preferences updated successfully.',
      });
    }
  };

  const isOnboarding = mode === 'onboarding';

  return (
    <div className={styles.form}>
      {isOnboarding && (
        <div className={styles.progress} role="status">
          <div className={`${styles.step} ${step >= 1 ? styles.stepActive : ''}`}>
            <span className={styles.stepNumber}>1</span> About You
          </div>
          <div className={styles.stepDivider} />
          <div className={`${styles.step} ${step >= 2 ? styles.stepActive : ''}`}>
            <span className={styles.stepNumber}>2</span> Job Preferences
          </div>
        </div>
      )}

      {step === 1 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>About You</h2>
          <p className={styles.sectionHint}>Tell us your name so we can personalize your experience.</p>

          <div className={styles.row}>
            <Input
              label="First Name"
              value={form.first_name ?? ''}
              onChange={(e) => set('first_name', e.target.value)}
              error={errors.first_name}
              required
              maxLength={MAX_NAME_LENGTH}
              autoComplete="given-name"
            />
            <Input
              label="Last Name"
              value={form.last_name ?? ''}
              onChange={(e) => set('last_name', e.target.value)}
              error={errors.last_name}
              required
              maxLength={MAX_NAME_LENGTH}
              autoComplete="family-name"
            />
          </div>

          <div className={styles.actions}>
            {onCancel && (
              <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
            )}
            <Button variant="primary" onClick={handleNext} disabled={isSaving}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>What kind of work are you looking for?</h2>
          <p className={styles.sectionHint}>
            Select the roles you're interested in. You can choose more than one.
          </p>

          <MultiSelect
            label="Preferred Job Roles"
            required
            values={form.preferred_roles ?? []}
            suggestions={SUGGESTED_ROLES}
            onChange={(v) => set('preferred_roles', v)}
            error={errors.preferred_roles}
            maxItems={MAX_ITEMS}
            maxItemLength={MAX_ITEM_LENGTH}
            placeholder="Search roles (e.g. Backend Developer)..."
          />

          <h2 className={styles.sectionTitle}>Where do you want to work?</h2>
          <p className={styles.sectionHint}>
            Choose all locations you're willing to work in.
          </p>

          <MultiSelect
            label="Preferred Locations"
            required
            values={form.preferred_locations ?? []}
            suggestions={SUGGESTED_LOCATIONS}
            onChange={(v) => set('preferred_locations', v)}
            error={errors.preferred_locations}
            maxItems={MAX_ITEMS}
            maxItemLength={MAX_ITEM_LENGTH}
            placeholder="Search locations..."
          />

          <h2 className={styles.sectionTitle}>Additional Preferences</h2>
          <p className={styles.sectionHint}>
            These are optional and help us refine your matches.
          </p>

          <div className={styles.row}>
            <ChipMulti
              label="Work Mode"
              values={form.work_mode ?? []}
              options={WORK_MODE_OPTIONS}
              onChange={(v) => set('work_mode', v as WorkMode[])}
              error={errors.work_mode}
            />
            <ChipMulti
              label="Employment Type"
              values={form.employment_type ?? []}
              options={EMPLOYMENT_TYPE_OPTIONS}
              onChange={(v) => set('employment_type', v as EmploymentType[])}
              error={errors.employment_type}
            />
          </div>

          <div className={styles.row}>
            <Select
              label="Experience Level"
              value={form.experience_level ?? ''}
              onChange={(e) =>
                set(
                  'experience_level',
                  e.target.value === '' ? null : (e.target.value as ExperienceLevel),
                )
              }
              options={[
                { value: '', label: 'Select experience level...' },
                ...EXPERIENCE_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              ]}
              error={errors.experience_level}
            />
            <Select
              label="Years of Experience"
              value={form.years_of_experience ?? ''}
              onChange={(e) =>
                set(
                  'years_of_experience',
                  e.target.value === '' ? null : (e.target.value as YearsOfExperience),
                )
              }
              options={[
                { value: '', label: 'Select years...' },
                ...YEARS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              ]}
              error={errors.years_of_experience}
            />
          </div>

          <SkillChips
            label="Skills"
            values={form.skills ?? []}
            onChange={(v) => set('skills', v)}
            maxItems={MAX_SKILLS}
            maxItemLength={MAX_SKILL_LENGTH}
            error={errors.skills}
          />

          <div className={styles.salarySection}>
            <label className={styles.salaryToggle}>
              <input
                type="checkbox"
                checked={salaryEnabled}
                onChange={(e) => {
                  setSalaryEnabled(e.target.checked);
                  if (!e.target.checked) {
                    set('minimum_salary', null);
                    setErrors((er) => {
                      const next = { ...er };
                      delete next.minimum_salary;
                      return next;
                    });
                  } else {
                    set('minimum_salary', form.minimum_salary ?? { amount: 0, currency: 'USD' });
                  }
                }}
              />
              <span>I want to set a minimum salary expectation</span>
            </label>

            {salaryEnabled && (
              <div className={styles.row}>
                <Input
                  label="Amount"
                  type="number"
                  min={1}
                  value={form.minimum_salary?.amount ?? 0}
                  onChange={(e) =>
                    set('minimum_salary', {
                      amount: Number(e.target.value) || 0,
                      currency: form.minimum_salary?.currency ?? 'USD',
                    })
                  }
                  error={errors.minimum_salary}
                />
                <Select
                  label="Currency"
                  value={form.minimum_salary?.currency ?? 'USD'}
                  onChange={(e) =>
                    set('minimum_salary', {
                      amount: form.minimum_salary?.amount ?? 0,
                      currency: e.target.value,
                    })
                  }
                  options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
                />
              </div>
            )}
          </div>

          <div className={styles.actions}>
            {isOnboarding ? (
              <>
                <Button variant="secondary" onClick={() => setStep(1)} disabled={isSaving}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleSubmit} isLoading={isSaving}>
                  Save & Continue
                </Button>
              </>
            ) : (
              <>
                {onCancel && (
                  <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                )}
                <Button variant="primary" onClick={handleSubmit} isLoading={isSaving}>
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ChipMultiProps<T extends string> {
  label: string;
  values: T[];
  options: { value: T; label: string }[];
  onChange: (next: T[]) => void;
  error?: string;
}

function ChipMulti<T extends string>({ label, values, options, onChange, error }: ChipMultiProps<T>) {
  return (
    <div className={styles.chipMulti}>
      <label className={styles.label}>{label}</label>
      <div className={styles.chipRow}>
        {options.map((opt) => {
          const active = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              className={`${styles.toggleChip} ${active ? styles.toggleChipActive : ''}`}
              onClick={() => {
                if (active) onChange(values.filter((v) => v !== opt.value));
                else onChange([...values, opt.value]);
              }}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}
