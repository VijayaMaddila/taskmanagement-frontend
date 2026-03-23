import { fetchAll, apiPost, apiPut, apiDelete } from '../utils/api';

export const getProjects = () =>
  fetchAll('/api/projects');

export const createProject = (data) =>
  apiPost('/api/projects', data);

export const updateProject = (id, data) =>
  apiPut(`/api/projects/${id}`, data);

export const deleteProject = (id) =>
  apiDelete(`/api/projects/${id}`);

export const getProjectMembers = (projectId) =>
  fetchAll(`/api/projects/${projectId}/members`);
