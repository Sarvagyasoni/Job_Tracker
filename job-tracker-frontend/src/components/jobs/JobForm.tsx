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

export function JobForm({ initialData, onSubmit, onCancel, isLoading }: JobFormProps) {
  const isEditing = !!initialData;

  const validate = (data: JobCreate | JobUpdate) => {
    const errors: Record<string, string> = {};

    if (!data.company?.trim()) {
      errors.company = 'Company is required';
    }

    if (data.link && data.link.trim()) {
      const url = data.link.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        errors.link = 'Link must start with http:// or https://';
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data: JobCreate | JobUpdate = {
      company: formData.get('company') as string,
      role: formData.get('role') as string || undefined,
      status: (formData.get('status') as JobStatus) || 'applied',
      date_applied: formData.get('date_applied') as string || undefined,
      link: formData.get('link') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };

    const validationErrors = validate(data);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <Input
          name="company"
          label="Company *"
          placeholder="e.g., Acme Corp"
          defaultValue={initialData?.company || ''}
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