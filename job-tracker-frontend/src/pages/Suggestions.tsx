import { useJobCrud } from '../hooks';
import { Button, Modal } from '../components/common';
import { SuggestedJobs, JobForm, JobSearch } from '../components/jobs';
import styles from './JobsList.module.css';

export function Suggestions() {
  const {
    isSubmitting,
    editingJob,
    isFormOpen,
    isDeleteOpen,
    isSearchOpen,
    closeForm,
    closeDelete,
    openSearch,
    closeSearch,
    handleSubmit,
    handleTrackSearchResult,
    confirmDelete,
  } = useJobCrud();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Suggestions</h1>
          <p>AI-powered job recommendations based on your resume</p>
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

      <SuggestedJobs onTrackJob={handleTrackSearchResult} />

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