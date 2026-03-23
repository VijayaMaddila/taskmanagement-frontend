import { fetchAll, apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

export const getUsers = () =>
  fetchAll('/api/users');

export const getUserById = (id) =>
  apiGet(`/api/users/${id}`);

export const createUser = (data) =>
  apiPost('/api/users', data);

export const updateUser = (id, data) =>
  apiPut(`/api/users/${id}`, data);

export const deleteUser = (id) =>
  apiDelete(`/api/users/${id}`);
