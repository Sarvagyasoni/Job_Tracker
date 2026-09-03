// API client for the profile feature.
// See features/profile/README.md Section 3.

import axiosInstance from '../../api/axiosInstance';
import type { UserProfile, UserProfileUpdate } from './types';

export const profileApi = {
  get: () =>
    axiosInstance
      .get<UserProfile>('/users/me/profile')
      .then((res) => res.data),

  update: (data: UserProfileUpdate) =>
    axiosInstance
      .put<UserProfile>('/users/me/profile', data)
      .then((res) => res.data),
};
