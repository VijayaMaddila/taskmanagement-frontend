import { fetchAll, apiPost, apiPut, apiDelete } from '../utils/api';

export const createTeam = (data) =>
  apiPost('/api/teams', data);

export const addTeamMembers = (teamId, members) =>
  apiPost(`/api/teams/${teamId}/members`, members);

export const removeTeamMember = (membershipId) =>
  apiDelete(`/api/teams/members/${membershipId}`);

export const sendInvite = (data) =>
  apiPost('/api/teams/invite/send', data);

export const declineInvite = (token) =>
  apiPost(`/api/teams/invite/decline?token=${token}`, {});

export const getPendingInvitesByProject = (projectId) =>
  fetchAll(`/api/teams/invites/project/${projectId}`);

export const getPendingInvitesByEmail = (email) =>
  fetchAll(`/api/teams/invites/user?email=${email}`);

export const assignTeamToProject = (projectId, data) =>
  apiPut(`/api/projects/${projectId}`, data);
