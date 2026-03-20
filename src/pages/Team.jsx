// Team page — shows all team members as cards
// Click a card to see their tasks and projects in a side panel
// Admins can invite new members via a modal

import { useState, useEffect } from 'react';
import { fetchAll, apiGet, apiPost } from '../utils/api';
import { hasRole } from '../utils/auth';
import Sidebar from '../components/Sidebar';
import './Team.css';

// Get 1-2 uppercase initials from a name (e.g. "Jane Doe" → "JD")
function getInitials(name = '') {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return initials || 'U';
}

// Colors for avatars, role badges, and status indicators
const AVATAR_COLORS = ['#6366f1', '#a855f7', '#22c55e', '#f97316', '#06b6d4', '#ec4899'];

const ROLE_COLORS = {
  ADMIN:     '#6366f1',
  DEVELOPER: '#22c55e',
};

const STATUS_LABEL = {
  TODO:        'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW:   'In Review',
  DONE:        'Done',
};

const STATUS_COLOR = {
  TODO:        '#94a3b8',
  IN_PROGRESS: '#6366f1',
  IN_REVIEW:   '#f97316',
  DONE:        '#22c55e',
};

export default function Team() {
  const isAdmin = hasRole('ADMIN');

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [selected, setSelected] = useState(null); // the member whose detail panel is open

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'DEVELOPER', projectId: '' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteDone, setInviteDone] = useState(null); // holds invited email after success

  // Pending invites panel state
  const [showPending, setShowPending] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingProject, setPendingProject] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');

  // Load all data when the page mounts
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [userList, taskList, projectList] = await Promise.all([
          fetchAll('/api/users'),
          fetchAll('/api/tasks'),
          fetchAll('/api/projects'),
        ]);
        setUsers(userList);
        setTasks(taskList);
        setProjects(projectList);
      } catch (error) {
        console.error('Failed to load team data:', error);
      }
      setLoading(false);
    };

    loadAllData();
  }, []);

  // Open the invite modal and reset the form
  const openInvite = () => {
    setInviteForm({ email: '', role: 'DEVELOPER', projectId: '' });
    setInviteError('');
    setInviteDone(null);
    setShowInvite(true);
  };

  const closeInvite = () => {
    setShowInvite(false);
    setInviteDone(null);
  };

  // Load pending invites for a project
  const loadPendingInvites = async (projectId) => {
    if (!projectId) { setPendingInvites([]); return; }
    setPendingLoading(true);
    setPendingError('');
    try {
      const res = await apiGet(`/api/teams/invites/project/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(Array.isArray(data) ? data : data.content ?? []);
      } else {
        setPendingError('Failed to load pending invites.');
      }
    } catch {
      setPendingError('Network error.');
    }
    setPendingLoading(false);
  };

  const openPending = () => {
    const firstProjectId = projects[0]?.id ?? '';
    setPendingProject(String(firstProjectId));
    setPendingError('');
    setPendingInvites([]);
    setShowPending(true);
    if (firstProjectId) loadPendingInvites(firstProjectId);
  };

  // Decline a pending invite
  const handleDecline = async (token) => {
    try {
      const res = await apiPost(`/api/teams/invite/decline?token=${encodeURIComponent(token)}`, {});
      if (res.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.token !== token));
      }
    } catch {
      // silently ignore
    }
  };

  // Send an invite email via the invite API
  const handleInvite = async (e) => {
    e.preventDefault();

    if (!inviteForm.email.trim()) {
      setInviteError('Email is required.');
      return;
    }

    setInviteSaving(true);
    setInviteError('');

    try {
      const body = {
        email:   inviteForm.email.trim(),
        role:    inviteForm.role,
      };
      if (inviteForm.projectId) {
        body.projectId = Number(inviteForm.projectId);
      }

      const response = await apiPost('/api/teams/invite/send', body);

      if (response.ok) {
        setInviteDone({ email: inviteForm.email.trim() });
      } else {
        let errorMessage = '';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            errorMessage = data.message || data.error || JSON.stringify(data);
          } else {
            errorMessage = await response.text();
          }
        } catch {
          errorMessage = '';
        }
        if (response.status === 409) {
          errorMessage = errorMessage || 'An invite has already been sent to this email, or the user is already a member.';
        }
        setInviteError(errorMessage || 'Failed to send invite.');
      }
    } catch {
      setInviteError('Network error.');
    }

    setInviteSaving(false);
  };

  // Get all tasks assigned to a specific user
  const getTasksForUser = (userId) => {
    return tasks.filter(task => {
      const assignedId = task.assignedToId ?? task.assignedTo?.id;
      return String(assignedId) === String(userId);
    });
  };

  // Get all projects that a user is involved in (based on their tasks)
  const getProjectsForUser = (userId) => {
    const projectIdSet = new Set(
      getTasksForUser(userId)
        .map(task => String(task.projectId ?? task.project?.id))
        .filter(Boolean)
    );
    return projects.filter(project => projectIdSet.has(String(project.id)));
  };

  // Count tasks per status for a user
  const getTaskCountsForUser = (userId) => {
    const userTaskList = getTasksForUser(userId);
    return {
      total:      userTaskList.length,
      todo:       userTaskList.filter(task => task.status === 'TODO').length,
      inProgress: userTaskList.filter(task => task.status === 'IN_PROGRESS').length,
      inReview:   userTaskList.filter(task => task.status === 'IN_REVIEW').length,
      done:       userTaskList.filter(task => task.status === 'DONE').length,
    };
  };

  // Get unique roles from the user list for the role filter dropdown
  const availableRoles = [...new Set(users.map(user => user.role).filter(Boolean))];

  // Filter users by search text and selected role
  const filteredUsers = users.filter(user => {
    if (search) {
      const usernameMatches = user.username?.toLowerCase().includes(search.toLowerCase());
      const emailMatches    = user.email?.toLowerCase().includes(search.toLowerCase());
      if (!usernameMatches && !emailMatches) return false;
    }
    if (filterRole && user.role !== filterRole) return false;
    return true;
  });

  // Pre-compute data for the selected user's detail panel
  const selectedUserTasks    = selected ? getTasksForUser(selected.id)    : [];
  const selectedUserProjects = selected ? getProjectsForUser(selected.id) : [];

  return (
    <div className="tm-layout">
      <Sidebar />

      <div className="tm-main">
        <header className="tm-header">
          <div>
            <h1 className="tm-title">Team</h1>
            <p className="tm-sub">
              {users.length} member{users.length !== 1 ? 's' : ''}
            </p>
          </div>

          {isAdmin && (
            <div className="tm-header-actions">
              <button className="tm-pending-btn" onClick={openPending}>
                Pending Invites
              </button>
              <button className="tm-invite-btn" onClick={openInvite}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                Invite Member
              </button>
            </div>
          )}
        </header>

        {/* Search and role filter */}
        <div className="tm-filters">
          <div className="tm-search-wrap">
            <svg className="tm-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className="tm-search"
              placeholder="Search by username or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="tm-select"
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
              className="tm-clear"
              onClick={() => { setSearch(''); setFilterRole(''); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Member grid + optional detail panel */}
        <div className="tm-body">

          <div className={`tm-grid ${selected ? 'tm-grid--narrow' : ''}`}>
            {loading ? (
              // Skeleton placeholder cards while loading
              [...Array(6)].map((_, index) => (
                <div key={index} className="tm-skeleton" />
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="tm-empty">No members found</div>
            ) : (
              filteredUsers.map((member, memberIndex) => {
                const counts = getTaskCountsForUser(member.id);
                const completionPercent = counts.total > 0
                  ? Math.round((counts.done / counts.total) * 100)
                  : 0;
                const isActiveCard = selected?.id === member.id;

                return (
                  <div
                    key={member.id}
                    className={`tm-card ${isActiveCard ? 'tm-card--active' : ''}`}
                    onClick={() => setSelected(isActiveCard ? null : member)}
                  >
                    {/* Card top: avatar + name/email + role badge */}
                    <div className="tm-card-top">
                      <div
                        className="tm-avatar"
                        style={{ background: AVATAR_COLORS[memberIndex % AVATAR_COLORS.length] }}
                      >
                        {getInitials(member.username || '')}
                      </div>

                      <div className="tm-card-info">
                        <span className="tm-card-name">{member.username}</span>
                        <span className="tm-card-email">{member.email}</span>
                      </div>

                      <span
                        className="tm-role-badge"
                        style={{
                          color:      ROLE_COLORS[member.role] || '#94a3b8',
                          background: (ROLE_COLORS[member.role] || '#94a3b8') + '18',
                        }}
                      >
                        {member.role}
                      </span>
                    </div>

                    {/* Task status chips */}
                    <div className="tm-stats-row">
                      {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map(statusCode => {
                        let countValue;
                        if (statusCode === 'TODO')        countValue = counts.todo;
                        else if (statusCode === 'IN_PROGRESS') countValue = counts.inProgress;
                        else if (statusCode === 'IN_REVIEW')   countValue = counts.inReview;
                        else                                   countValue = counts.done;

                        return (
                          <div key={statusCode} className="tm-stat-chip">
                            <span className="tm-stat-dot" style={{ background: STATUS_COLOR[statusCode] }} />
                            <span className="tm-stat-num">{countValue}</span>
                            <span className="tm-stat-lbl">{STATUS_LABEL[statusCode]}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    {counts.total > 0 && (
                      <div className="tm-progress-wrap">
                        <div className="tm-progress-bar">
                          <div className="tm-progress-fill" style={{ width: `${completionPercent}%` }} />
                        </div>
                        <span className="tm-progress-pct">{completionPercent}% done</span>
                      </div>
                    )}

                    {counts.total === 0 && (
                      <p className="tm-no-tasks">No tasks assigned</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Detail side panel */}
          {selected && (
            <div className="tm-detail">
              <div className="tm-detail-header">
                <div
                  className="tm-detail-avatar"
                  style={{
                    background: AVATAR_COLORS[
                      users.findIndex(u => u.id === selected.id) % AVATAR_COLORS.length
                    ],
                  }}
                >
                  {getInitials(selected.username || '')}
                </div>

                <div>
                  <h2 className="tm-detail-name">{selected.username}</h2>
                  <span className="tm-detail-email">{selected.email}</span>
                </div>

                <button className="tm-detail-close" onClick={() => setSelected(null)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="tm-detail-body">
                {/* Projects section */}
                <div className="tm-detail-section">
                  <p className="tm-detail-label">Projects ({selectedUserProjects.length})</p>

                  {selectedUserProjects.length === 0 ? (
                    <p className="tm-detail-empty">Not assigned to any project</p>
                  ) : (
                    <div className="tm-detail-projects">
                      {selectedUserProjects.map((project, projectIndex) => (
                        <span
                          key={project.id}
                          className="tm-project-chip"
                          style={{
                            borderColor: AVATAR_COLORS[projectIndex % AVATAR_COLORS.length] + '60',
                            color:       AVATAR_COLORS[projectIndex % AVATAR_COLORS.length],
                          }}
                        >
                          {project.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks section */}
                <div className="tm-detail-section">
                  <p className="tm-detail-label">Assigned Tasks ({selectedUserTasks.length})</p>

                  {selectedUserTasks.length === 0 ? (
                    <p className="tm-detail-empty">No tasks assigned</p>
                  ) : (
                    <div className="tm-detail-tasks">
                      {selectedUserTasks.map(task => (
                        <div key={task.id} className="tm-task-row">
                          <span
                            className="tm-task-dot"
                            style={{ background: STATUS_COLOR[task.status] || '#e5e7eb' }}
                          />
                          <span className="tm-task-id">#{task.id}</span>
                          <span className="tm-task-title">{task.title}</span>
                          <span className="tm-task-status" style={{ color: STATUS_COLOR[task.status] }}>
                            {STATUS_LABEL[task.status] || task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInvite && (
        <div className="tm-modal-overlay" onClick={closeInvite}>
          <div className="tm-modal" onClick={e => e.stopPropagation()}>

            <div className="tm-modal-header">
              <div className="tm-modal-title-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="8" cy="6" r="3.5" stroke="#6366f1" strokeWidth="1.4" />
                  <path d="M2 17c0-3.314 2.686-6 6-6" stroke="#6366f1" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M15 11v6M12 14h6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <h2>Invite Member</h2>
              </div>

              <button className="tm-modal-close" onClick={closeInvite}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Show success screen or invite form */}
            {inviteDone ? (
              <div className="tm-invite-success">
                <div className="tm-success-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="13" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
                    <path d="M8 14l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <h3>Invite sent!</h3>
                <p>An invitation email has been sent to <strong>{inviteDone.email}</strong>.</p>
                <p className="tm-invite-note">They will receive a link to register and join the team.</p>

                <div className="tm-modal-actions">
                  <button
                    className="tm-btn-secondary"
                    onClick={() => {
                      setInviteDone(null);
                      setInviteForm({ email: '', role: 'DEVELOPER', projectId: '' });
                    }}
                  >
                    Invite Another
                  </button>
                  <button className="tm-btn-primary" onClick={closeInvite}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="tm-invite-form" onSubmit={handleInvite}>
                <p className="tm-invite-desc">
                  An invitation email will be sent with a link to register and join the team.
                </p>

                {inviteError && (
                  <div className="tm-form-error">{inviteError}</div>
                )}

                <div className="tm-form-group">
                  <label htmlFor="invite-email">Email *</label>
                  <input
                    id="invite-email"
                    name="email"
                    type="email"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="john@example.com"
                    autoFocus
                  />
                </div>

                <div className="tm-form-group">
                  <label htmlFor="invite-role">Role</label>
                  <select
                    id="invite-role"
                    name="role"
                    value={inviteForm.role}
                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    <option value="DEVELOPER">Developer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="tm-form-group">
                  <label htmlFor="invite-project">Project (optional)</label>
                  <select
                    id="invite-project"
                    name="projectId"
                    value={inviteForm.projectId}
                    onChange={e => setInviteForm({ ...inviteForm, projectId: e.target.value })}
                  >
                    <option value="">No specific project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div className="tm-modal-actions">
                  <button type="button" className="tm-btn-secondary" onClick={closeInvite}>
                    Cancel
                  </button>
                  <button type="submit" className="tm-btn-primary" disabled={inviteSaving}>
                    {inviteSaving ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Pending Invites Modal */}
      {showPending && (
        <div className="tm-modal-overlay" onClick={() => setShowPending(false)}>
          <div className="tm-modal" onClick={e => e.stopPropagation()}>
            <div className="tm-modal-header">
              <div className="tm-modal-title-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8.5" stroke="#6366f1" strokeWidth="1.4" />
                  <path d="M10 6v4l2.5 2.5" stroke="#6366f1" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <h2>Pending Invites</h2>
              </div>
              <button className="tm-modal-close" onClick={() => setShowPending(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="tm-pending-body">
              <div className="tm-form-group">
                <label htmlFor="pending-project">Project</label>
                <select
                  id="pending-project"
                  value={pendingProject}
                  onChange={e => {
                    setPendingProject(e.target.value);
                    loadPendingInvites(e.target.value);
                  }}
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {pendingError && <div className="tm-form-error">{pendingError}</div>}

              {pendingLoading ? (
                <p className="tm-detail-empty">Loading...</p>
              ) : pendingInvites.length === 0 ? (
                <p className="tm-detail-empty">No pending invites for this project.</p>
              ) : (
                <div className="tm-pending-list">
                  {pendingInvites.map(inv => (
                    <div key={inv.token ?? inv.id} className="tm-pending-row">
                      <div className="tm-pending-info">
                        <span className="tm-pending-email">{inv.email}</span>
                        <span
                          className="tm-role-badge"
                          style={{
                            color:      ROLE_COLORS[inv.role] || '#94a3b8',
                            background: (ROLE_COLORS[inv.role] || '#94a3b8') + '18',
                          }}
                        >
                          {inv.role}
                        </span>
                      </div>
                      <button
                        className="tm-decline-btn"
                        onClick={() => handleDecline(inv.token)}
                        title="Decline invite"
                      >
                        Decline
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
