import { apiGet, apiPut } from '../utils/api';

export const getProfile = () =>
  apiGet('/api/profile');

export const updateProfile = (data) =>
  apiPut('/api/profile', data);

export const changePassword = (data) =>
  apiPut('/api/profile/change-password', data);
