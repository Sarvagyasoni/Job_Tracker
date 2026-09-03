// Barrel export for the profile feature.
// All consumers should import from this file, not the individual modules.

export { ProfilePage } from './ProfilePage';
export { ProfileOnboarding } from './ProfileOnboarding';
export { ProfileGate } from './ProfileGate';
export { ProfileForm } from './ProfileForm';
export { MultiSelect } from './MultiSelect';
export { SkillChips } from './SkillChips';
export { useProfile, useFirstName } from './useProfile';
export { profileApi } from './api';
export type {
  UserProfile,
  UserProfileUpdate,
  WorkMode,
  EmploymentType,
  ExperienceLevel,
  YearsOfExperience,
  SalaryExpectation,
} from './types';
export { isProfileComplete } from './validation';
