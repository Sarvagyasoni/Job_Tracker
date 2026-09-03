// Editable profile page, accessed from the sidebar "Preferences" item.
// Renders the standard app Layout (with sidebar) and the same form, but
// prefilled with the user's existing data and in single-page edit mode.

import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout';
import { ProfileForm } from './ProfileForm';
import { useProfile } from './useProfile';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, isLoading, isSaving, error, updateProfile } = useProfile();

  if (isLoading) {
    return (
      <Layout>
        <div className={styles.container}>
          <p className={styles.loading}>Loading your preferences...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Preferences</h1>
          <p className={styles.subtitle}>
            Update your profile and job-search preferences.
          </p>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.card}>
          <ProfileForm
            initialProfile={profile}
            isSaving={isSaving}
            mode="edit"
            onCancel={() => navigate('/dashboard')}
            onSubmit={updateProfile}
          />
        </div>
      </div>
    </Layout>
  );
}
