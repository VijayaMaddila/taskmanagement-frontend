import { fetchAll, apiPost, apiPut, apiDelete } from '../utils/api';

export const getTasks = (projectId) =>
  fetchAll(`/api/tasks/project/${projectId}`);

export const createTask = (data) =>
  apiPost('/api/tasks', data);

export const updateTask = (id, data) =>
  apiPut(`/api/tasks/${id}`, data);

export const deleteTask = (id) =>
  apiDelete(`/api/tasks/${id}`);
