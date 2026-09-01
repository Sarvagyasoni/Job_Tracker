import type { JobStatus } from '../../types';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};