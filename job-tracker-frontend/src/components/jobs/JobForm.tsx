import { useState } from 'react';
import { Button, Input, Select, Textarea } from '../common';
import type { JobCreate, JobUpdate, Job, JobStatus } from '../../types';
import styles from './JobForm.module.css';

interface JobFormProps {
  initialData?: Job | null;
  onSubmit: (data: JobCreate | JobUpdate) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  onCancel: () => void;
  isLoading: boolean;
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

type FormFields = {
  company: string;
  role: string;
  status: JobStatus;
  date_applied: string;
  link: string;
  notes: string;
};

function getFormData(form: HTMLFormElement): FormFields {
  return {
    company: (form.elements.namedItem('company') as HTMLInputElement).value,
    role: (form.elements.namedItem('role') as HTMLInputElement).value,
    status: ((form.elements.namedItem('status') as HTMLSelectElement).value as JobStatus) || 'applied',
    date_applied: (form.elements.namedItem('date_applied') as HTMLInputElement).value,
    link: (form.elements.namedItem('link') as HTMLInputElement).value,
    notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
  };
}

function validate(data: FormFields): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.company.trim()) {
    errors.company = 'Company is required';
  }

  const link = data.link.trim();
  if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
    errors.link = 'Link must start with http:// or https://';
  }

  return errors;
}

export function JobForm({ initialData, onSubmit, onCancel, isLoading }: JobFormProps) {
  const isEditing = !!initialData;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = getFormData(form);

    const validationErrors = validate(data);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});

    const payload: JobCreate | JobUpdate = {
      company: data.company,
      role: data.role || undefined,
      status: data.status,
      date_applied: data.date_applied || undefined,
      link: data.link || undefined,
      notes: data.notes || undefined,
    };

    const result = await onSubmit(payload);

    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
    }
  };

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <Input
          name="company"
          label="Company *"
          placeholder="e.g., Acme Corp"
          defaultValue={initialData?.company || ''}
          error={fieldErrors.company}
          onChange={() => clearFieldError('company')}
          required
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <Input
          name="role"
          label="Role"
          placeholder="e.g., Senior Backend Engineer"
          defaultValue={initialData?.role || ''}
        />
      </div>

      <div className={styles.field}>
        <Select
          name="status"
          label="Status"
          options={STATUS_OPTIONS}
          defaultValue={initialData?.status || 'applied'}
        />
      </div>

      <div className={styles.field}>
        <Input
          name="date_applied"
          type="date"
          label="Date Applied"
          defaultValue={initialData?.date_applied || ''}
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div className={styles.field}>
        <Input
          name="link"
          type="url"
          label="Job Posting URL"
          placeholder="https://example.com/job/123"
          defaultValue={initialData?.link || ''}
          error={fieldErrors.link}
          onChange={() => clearFieldError('link')}
        />
      </div>

      <div className={styles.field}>
        <Textarea
          name="notes"
          label="Notes"
          placeholder="Any notes about this application..."
          defaultValue={initialData?.notes || ''}
          rows={4}
        />
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {isEditing ? 'Save Changes' : 'Create Application'}
        </Button>
      </div>
    </form>
  );
}