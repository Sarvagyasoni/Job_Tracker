// Onboarding page shown to a brand-new user. No sidebar/nav. Single purpose:
// collect first name + last name + job preferences, then route to /dashboard.

import { useNavigate } from 'react-router-dom';
import { ProfileForm } from './ProfileForm';
import { useProfile } from './useProfile';
import { isProfileComplete } from './validation';
import styles from './ProfileOnboarding.module.css';

export function ProfileOnboarding() {
  const navigate = useNavigate();
  const { profile, isLoading, isSaving, updateProfile } = useProfile();

  if (isLoading) {
    return (
      <div className={styles.onboarding}>
        <div className={styles.card}>
          <p className={styles.loading}>Loading...</p>
        </div>
      </div>
    );
  }

  // If the user somehow has a complete profile already (e.g. they refreshed
  // mid-onboarding after the form save succeeded), just send them on.
  if (isProfileComplete(profile)) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className={styles.onboarding}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Tell us what you're looking for</h1>
          <p className={styles.subtitle}>
            Set your preferences so we can find jobs that are relevant to you.
          </p>
        </header>
        <ProfileForm
          initialProfile={profile}
          isSaving={isSaving}
          mode="onboarding"
          onSubmit={async (data) => {
            const result = await updateProfile(data);
            if (result.success) {
              navigate('/dashboard', { replace: true });
            }
            return result;
          }}
        />
      </div>
    </div>
  );
}
