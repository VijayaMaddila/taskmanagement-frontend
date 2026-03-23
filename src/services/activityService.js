import { fetchAll, apiPost } from '../utils/api';

export const getActivity = (entityType, entityId) =>
  fetchAll(`/api/activity/entity?entityType=${entityType}&entityId=${entityId}`);

export const logActivity = (data) =>
  apiPost('/api/activity', data);
