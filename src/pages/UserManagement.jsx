// UserManagement page — admin only
// Shows a table of all users with search, filter, add, edit, and delete

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getProjectMembers } from "../services/projectService";
import { getUsers, getUserById, createUser, updateUser, deleteUser } from "../services/userService";
import { isAuthenticated, hasRole } from '../utils/auth';
import Sidebar from '../components/Sidebar';
import './UserManagement.css';

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) || {}; }
  catch { return {}; }
}

// Get 1-2 uppercase initials from a display name (e.g. "Jane Doe" → "JD")
function getInitials(name = '') {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return initials || 'U';
}

// Colors for role badges
const ROLE_COLORS = {
  ADMIN:     '#6366f1',
  DEVELOPER: '#22c55e',
  MANAGER:   '#f97316',
};

// Colors for avatar circles
const AVATAR_COLORS = ['#6366f1', '#a855f7', '#22c55e', '#f97316', '#06b6d4', '#ec4899'];

// Default empty form values
const EMPTY_FORM = { username: '', email: '', password: '', role: 'DEVELOPER' };

export default function UserManagement() {
  const navigate = useNavigate();

  // Redirect non-admins away from this page
  if (!isAuthenticated() || !hasRole('ADMIN')) {
    navigate('/board');
    return null;
  }

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, username }
  const [editingUser, setEditingUser] = useState(null); // null = creating new user

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load users belonging to projects created by the current admin
  const loadUsers = async () => {
    setLoading(true);
    try {
      const currentUser = getStoredUser();
      const allProjects = await getProjects();
      const myProjects = allProjects.filter(p => String(p.createdById) === String(currentUser.id));

      const memberLists = await Promise.all(
        myProjects.map(p => getProjectMembers(p.id).catch(() => []))
      );

      // Deduplicate users by id across all project members
      const seenIds = new Set();
      const userList = [];
      for (const members of memberLists) {
        for (const m of members) {
          const u = m.user ?? m;
          if (u?.id && !seenIds.has(u.id)) {
            seenIds.add(u.id);
            userList.push({ ...u, role: m.role ?? u.role });
          }
        }
      }

      setUsers(userList);
    } catch (loadError) {
      console.error('Failed to load users:', loadError);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users by search text and role
  const filteredUsers = users.filter(user => {
    if (search) {
      const nameMatches     = user.name?.toLowerCase().includes(search.toLowerCase());
      const usernameMatches = user.username?.toLowerCase().includes(search.toLowerCase());
      const emailMatches    = user.email?.toLowerCase().includes(search.toLowerCase());
      if (!nameMatches && !usernameMatches && !emailMatches) return false;
    }
    if (filterRole && user.role !== filterRole) return false;
    return true;
  });

  // Open the modal to create a new user
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  // Open the modal to edit an existing user — fetch fresh data by ID first
  const openEditModal = async (userToEdit) => {
    setEditingUser(userToEdit);
    setError('');
    setShowModal(true);

    try {
      const res = await getUserById(userToEdit.id);
      const fresh = res.ok ? await res.json() : userToEdit;
      setEditingUser(fresh);
      setFormData({
        username: fresh.username || '',
        email:    fresh.email    || '',
        password: '',
        role:     fresh.role     || 'DEVELOPER',
      });
    } catch {
      setFormData({
        username: userToEdit.username || '',
        email:    userToEdit.email    || '',
        password: '',
        role:     userToEdit.role     || 'DEVELOPER',
      });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setError('');
  };

  // Handle create or edit form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.email.trim()) {
      setError('Username and email are required.');
      return;
    }

    // Password is required only when creating a new user
    if (!editingUser && !formData.password.trim()) {
      setError('Password is required for new users.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = { ...formData };

      // When editing: if the password field is blank, don't send it
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      let response;
      if (editingUser) {
        response = await updateUser(editingUser.id, payload);
      } else {
        response = await createUser(payload);
      }

      if (response.ok) {
        closeModal();
        loadUsers();
      } else {
        const errorMessage = await response.text().catch(() => '');
        setError(errorMessage || 'Failed to save user.');
      }
    } catch {
      setError('Network error.');
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await deleteUser(deleteTarget.id);
      if (response.ok || response.status === 204) {
        loadUsers();
      }
    } catch (deleteError) {
      console.error('Failed to delete user:', deleteError);
    }
    setDeleteTarget(null);
  };

  // Get unique roles from the user list for the filter dropdown
  const availableRoles = [...new Set(users.map(user => user.role).filter(Boolean))];

  return (
    <div className="um-layout">
      <Sidebar />

      <div className="um-main">
        <header className="um-header">
          <div>
            <h1 className="um-title">User Management</h1>
            <p className="um-sub">Manage team members and their access roles</p>
          </div>

          <button className="um-create-btn" onClick={openCreateModal}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Add User
          </button>
        </header>

        {/* Stats bar: total users + count per role */}
        <div className="um-stats">
          <div className="um-stat">
            <span className="um-stat-value">{users.length}</span>
            <span className="um-stat-label">Total Members</span>
          </div>

          {availableRoles.map(role => (
            <div key={role} className="um-stat">
              <span
                className="um-stat-value"
                style={{ color: ROLE_COLORS[role] || '#6b7280' }}
              >
                {users.filter(user => user.role === role).length}
              </span>
              <span className="um-stat-label">{role}</span>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="um-filters">
          <div className="um-search-wrap">
            <svg className="um-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className="um-search"
              placeholder="Search by name, username or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="um-select"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {(search || filterRole) && (
            <button
              className="um-clear-btn"
              onClick={() => { setSearch(''); setFilterRole(''); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* User table */}
        <div className="um-table-wrap">
          {loading ? (
            <div className="um-loading">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="um-skeleton" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="um-empty">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="18" r="10" stroke="#d1d5db" strokeWidth="2" />
                <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p>No users found</p>
            </div>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, userIndex) => (
                  <tr key={user.id} className="um-row">
                    <td className="um-td-member">
                      <div
                        className="um-avatar"
                        style={{ background: AVATAR_COLORS[userIndex % AVATAR_COLORS.length] }}
                      >
                        {getInitials(user.username || '')}
                      </div>
                      <div className="um-member-info">
                        <span className="um-member-name">{user.username || '—'}</span>
                      </div>
                    </td>

                    <td className="um-td">
                      <span className="um-username">@{user.username || '—'}</span>
                    </td>

                    <td className="um-td">
                      <span className="um-email">{user.email || '—'}</span>
                    </td>

                    <td className="um-td">
                      <span
                        className="um-role-badge"
                        style={{
                          color:       ROLE_COLORS[user.role] || '#6b7280',
                          background:  (ROLE_COLORS[user.role] || '#6b7280') + '18',
                          borderColor: (ROLE_COLORS[user.role] || '#6b7280') + '40',
                        }}
                      >
                        {user.role || '—'}
                      </span>
                    </td>

                    <td className="um-td um-td-actions">
                      <button className="um-action-btn um-edit-btn" onClick={() => openEditModal(user)}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                        </svg>
                        Edit
                      </button>

                      <button className="um-action-btn um-delete-btn" onClick={() => setDeleteTarget({ id: user.id, username: user.username })}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="um-modal-overlay" onClick={closeModal}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>

            <div className="um-modal-header">
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="um-modal-close" onClick={closeModal}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form className="um-form" onSubmit={handleSubmit}>

              {error && <div className="um-form-error">{error}</div>}

              <div className="um-form-group">
                <label>Username *</label>
                <input
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>

              <div className="um-form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div className="um-form-row">
                <div className="um-form-group">
                  <label>{editingUser ? 'New Password' : 'Password *'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Leave blank to keep current' : 'Min 8 characters'}
                  />
                </div>

                <div className="um-form-group">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="DEVELOPER">DEVELOPER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="VIEWER">VIEWER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="um-form-actions">
                <button type="button" className="um-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="um-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Add User'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="um-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="um-modal um-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="um-delete-icon">
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="um-delete-title">Delete User</h2>
            <p className="um-delete-msg">
              Are you sure you want to delete <strong>{deleteTarget.username}</strong>? This action cannot be undone.
            </p>
            <div className="um-form-actions">
              <button className="um-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="um-btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
