import { fetchAll, apiPost, apiPut, apiDelete } from '../utils/api';

export const getComments = (taskId) =>
  fetchAll(`/api/comments/task/${taskId}`);

export const createComment = (data) =>
  apiPost('/api/comments', data);

export const updateComment = (id, data) =>
  apiPut(`/api/comments/${id}`, data);

export const deleteComment = (id) =>
  apiDelete(`/api/comments/${id}`);
