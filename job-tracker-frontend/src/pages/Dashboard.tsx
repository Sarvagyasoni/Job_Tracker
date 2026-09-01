import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth';
import { useJobs, useJobCrud } from '../hooks';
import { Button, Modal } from '../components/common';
import { JobForm, JobSearch, JobDetail, JOB_STATUS_LABELS } from '../components/jobs';
import type { Job } from '../types';
import styles from './Dashboard.module.css';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  status: Job['status'];
}

function StatCard({ label, value, icon, status }: StatCardProps) {
  return (
    <article className={`${styles.statCard} ${styles[`stat-${status}`]}`}>
      <div className={styles.statIconWrapper}>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={styles.statContent}>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{value}</p>
      </div>
    </article>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { jobs, fetchJobs } = useJobs();
  const {
    isSubmitting,
    editingJob,
    isFormOpen,
    isDeleteOpen,
    isSearchOpen,
    openEdit,
    closeForm,
    closeDelete,
    openSearch,
    closeSearch,
    handleSubmit,
    handleTrackSearchResult,
    confirmDelete,
  } = useJobCrud();

  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    interviewing: jobs.filter(j => j.status === 'interviewing').length,
    offer: jobs.filter(j => j.status === 'offer').length,
    rejected: jobs.filter(j => j.status === 'rejected').length,
  }), [jobs]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const recentJobs = useMemo(() =>
    [...jobs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5),
  [jobs]);

  const closeView = () => {
    setIsViewOpen(false);
    setViewingJob(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.greeting}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>
            {getGreeting()}, {user?.email?.split('@')[0] || 'User'} 👋
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={openSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Discover Jobs
          </Button>
        </div>
      </header>

      <section className={styles.statsSection} aria-label="Application statistics">
        <StatCard
          label="Total Applications"
          value={stats.total}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
          status="applied"
        />
        <StatCard
          label="Interviewing"
          value={stats.interviewing}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
          status="interviewing"
        />
        <StatCard
          label="Offers"
          value={stats.offer}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          status="offer"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          }
          status="rejected"
        />
      </section>

      {recentJobs.length > 0 && (
        <section className={styles.recentSection} aria-label="Recent applications">
          <h2 className={styles.sectionTitle}>Recent Applications</h2>
          <div className={styles.recentList}>
            {recentJobs.map((job) => (
              <article key={job.id} className={styles.recentItem}>
                <div className={styles.recentInfo}>
                  <h3 className={styles.recentCompany}>{job.company}</h3>
                  {job.role && <p className={styles.recentRole}>{job.role}</p>}
                </div>
                <span className={`${styles.recentStatus} ${styles[`status-${job.status}`]}`}>
                  {JOB_STATUS_LABELS[job.status]}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingJob ? 'Edit Application' : 'New Application'}
        size="lg"
      >
        <JobForm
          initialData={editingJob}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isLoading={isSubmitting}
        />
      </Modal>

      <Modal
        isOpen={isViewOpen}
        onClose={closeView}
        title="Application Details"
        size="lg"
      >
        {viewingJob && <JobDetail job={viewingJob} onEdit={(j) => { closeView(); openEdit(j); }} onClose={closeView} />}
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        title="Delete Application"
        size="sm"
      >
        <div className={styles.deleteConfirm}>
          <p>Are you sure you want to delete this application? This action cannot be undone.</p>
          <div className={styles.deleteActions}>
            <Button variant="secondary" onClick={closeDelete}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isSubmitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSearchOpen}
        onClose={closeSearch}
        title="Discover Jobs"
        size="xl"
      >
        <JobSearch onTrackJob={handleTrackSearchResult} onClose={closeSearch} />
      </Modal>
    </div>
  );
}