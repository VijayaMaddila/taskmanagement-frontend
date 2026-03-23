import { apiGet } from '../utils/api';

export const getDashboardStats = () =>
  apiGet('/api/dashboard/stats');
