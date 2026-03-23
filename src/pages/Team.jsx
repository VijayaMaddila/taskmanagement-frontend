import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects, getProjectMembers } from "../services/projectService";
import { getTasks } from "../services/taskService";
import {
  createTeam,
  addTeamMembers,
  removeTeamMember,
  sendInvite,
  declineInvite,
  getPendingInvitesByProject,
  getPendingInvitesByEmail,
  assignTeamToProject,
} from "../services/teamService";
import { getUsers } from "../services/userService";
import { hasRole } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import ConfirmModal from "../components/ConfirmModal";
import "./Team.css";

const AVATAR_COLORS = [
  "#6366f1",
  "#a855f7",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];
const ROLE_COLORS = { ADMIN: "#6366f1", DEVELOPER: "#22c55e" };

export default function Team() {
  const isAdmin = hasRole("ADMIN");
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [teamSearch, setTeamSearch] = useState("");

  const teamGroups = allTeamMembers.reduce((acc, m) => {
    const key = m.name || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const filteredTeamGroups = Object.fromEntries(
    Object.entries(teamGroups).filter(([teamName, members]) => {
      const q = teamSearch.toLowerCase();
      if (!q) return true;
      if (teamName.toLowerCase().includes(q)) return true;
      return members.some(
        (m) =>
          (m.user?.username || m.username || "").toLowerCase().includes(q) ||
          (m.user?.email || m.email || "").toLowerCase().includes(q),
      );
    }),
  );
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState("invite");
  const [addDone, setAddDone] = useState(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "DEVELOPER",
    projectId: "",
  });
  const [inviteError, setInviteError] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [directForm, setDirectForm] = useState({
    userId: "",
    role: "DEVELOPER",
    projectId: "",
    teamMode: "existing",
    teamId: "",
    newTeamName: "",
  });
  const [directError, setDirectError] = useState("");
  const [directSaving, setDirectSaving] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingProject, setPendingProject] = useState("");
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [pendingEmailQuery, setPendingEmailQuery] = useState("");

  const loadAllTeamMembers = async (projectList) => {
    const allTeams = (
      await Promise.all(
        projectList.map((proj) =>
          getProjectMembers(proj.id)
            .then((members) =>
              members
                .filter((m) => m.role !== "ADMIN")
                .map((m) => ({
                  ...m,
                  name: proj.team?.name || proj.name,
                  _projectId: proj.id,
                  _projectName: proj.name,
                })),
            )
            .catch(() => []),
        ),
      )
    ).flat();
    setAllTeamMembers(allTeams);
  };
  const refreshTasks = async (projectList) => {
    setTasksLoading(true);
    try {
      const perProject = await Promise.all(
        projectList.map((proj) =>
          getTasks(proj.id)
            .then((tasks) =>
              tasks.map((t) => ({
                ...t,
                projectId: proj.id,
                assignedToId:
                  Number(
                    t.assignedToId ??
                      t.assignedTo?.id ??
                      t.assigneeId ??
                      t.assignee?.id ??
                      0,
                  ) || null,
              })),
            )
            .catch(() => []),
        ),
      );
      setTasks(perProject.flat());
    } catch (e) {
      console.error(e);
    }
    setTasksLoading(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, p] = await Promise.all([getUsers(), getProjects()]);
        setUsers(u);
        setProjects(p);
        await Promise.all([refreshTasks(p), loadAllTeamMembers(p)]);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const handleRemoveMember = async () => {
    const membershipId = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await removeTeamMember(membershipId);
      if (res.ok) {
        setAllTeamMembers((prev) => prev.filter((m) => m.id !== membershipId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openAdd = (tab = "invite") => {
    setAddTab(tab);
    setAddDone(null);
    setInviteForm({ email: "", role: "DEVELOPER", projectId: "" });
    setInviteError("");
    setDirectForm({
      userId: "",
      role: "DEVELOPER",
      projectId: "",
      teamMode: "existing",
      teamId: "",
      newTeamName: "",
    });
    setDirectError("");
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setAddDone(null);
  };

  const resetToAddAnother = () => {
    setAddDone(null);
    setInviteForm({ email: "", role: "DEVELOPER", projectId: "" });
    setDirectForm({
      userId: "",
      role: "DEVELOPER",
      projectId: "",
      teamMode: "existing",
      teamId: "",
      newTeamName: "",
    });
    setInviteError("");
    setDirectError("");
  };
  const switchTab = (tab) => {
    setAddTab(tab);
    setInviteError("");
    setDirectError("");
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteSaving(true);
    setInviteError("");
    try {
      const body = { email: inviteForm.email.trim(), role: inviteForm.role };
      if (inviteForm.projectId) body.projectId = Number(inviteForm.projectId);
      const res = await sendInvite(body);
      if (res.ok) {
        setAddDone({ type: "invite", label: inviteForm.email.trim() });
      } else {
        let msg = "";
        try {
          msg = res.headers.get("content-type")?.includes("application/json")
            ? (await res.json()).message || ""
            : await res.text();
        } catch {}
        setInviteError(
          res.status === 409
            ? "An invite has already been sent, or this user is already a member."
            : msg || "Failed to send invite.",
        );
      }
    } catch {
      setInviteError("Network error.");
    }
    setInviteSaving(false);
  };
  const handleDirectAdd = async (e) => {
    e.preventDefault();
    if (!directForm.userId || !directForm.projectId) {
      setDirectError("User and project are required.");
      return;
    }
    if (directForm.teamMode === "existing" && !directForm.teamId) {
      setDirectError('Please select a team, or switch to "Create New Team".');
      return;
    }
    if (directForm.teamMode === "new" && !directForm.newTeamName.trim()) {
      setDirectError("Team name is required.");
      return;
    }
    setDirectSaving(true);
    setDirectError("");
    try {
      let teamId;

      if (directForm.teamMode === "existing") {
        teamId = Number(directForm.teamId);
        const project = projects.find(
          (p) => String(p.id) === String(directForm.projectId),
        );
        if (String(project?.team?.id) !== String(teamId)) {
          await assignTeamToProject(directForm.projectId, { teamId });
        }
      } else {
        const teamRes = await createTeam({
          name: directForm.newTeamName.trim(),
        });
        if (!teamRes.ok) {
          setDirectError("Failed to create team.");
          setDirectSaving(false);
          return;
        }
        const teamData = await teamRes.json();
        teamId = teamData.id;
        await assignTeamToProject(directForm.projectId, { teamId });
      }

      const res = await addTeamMembers(teamId, {
        userId: Number(directForm.userId),
        role: directForm.role,
      });
      if (res.ok) {
        const addedUser = users.find(
          (u) => String(u.id) === String(directForm.userId),
        );
        setAddDone({ type: "direct", label: addedUser?.username || "User" });
        await loadAllTeamMembers(projects);
      } else {
        const msg = await res.text().catch(() => "");
        setDirectError(
          res.status === 409
            ? "This user is already a member of this team."
            : msg || "Failed to add member.",
        );
      }
    } catch {
      setDirectError("Network error.");
    }
    setDirectSaving(false);
  };

  const loadPendingByProject = async (pid) => {
    if (!pid) {
      setPendingInvites([]);
      return;
    }
    setPendingLoading(true);
    setPendingError("");
    try {
      setPendingInvites(await getPendingInvitesByProject(pid));
    } catch {
      setPendingError("Failed to load pending invites.");
    }
    setPendingLoading(false);
  };

  const loadPendingByEmail = async (email) => {
    if (!email.trim()) {
      setPendingInvites([]);
      return;
    }
    setPendingLoading(true);
    setPendingError("");
    try {
      setPendingInvites(await getPendingInvitesByEmail(email.trim()));
    } catch {
      setPendingError("Failed to load invites for this email.");
    }
    setPendingLoading(false);
  };

  const openPending = () => {
    const firstPid = String(projects[0]?.id ?? "");
    setPendingProject(firstPid);
    setPendingEmailQuery("");
    setPendingError("");
    setPendingInvites([]);
    setShowPending(true);
    if (firstPid) loadPendingByProject(firstPid);
  };

  const handleDecline = async (token) => {
    try {
      const res = await declineInvite(encodeURIComponent(token));
      if (res.ok)
        setPendingInvites((prev) => prev.filter((i) => i.token !== token));
    } catch {}
  };

  return (
    <div className="tm-layout">
      <Sidebar />

      <div className="tm-main">
        {/* Header */}
        <header className="tm-header">
          <div className="tm-header-left">
            <h1 className="tm-title">Team</h1>
            <p className="tm-sub">
              {new Set(allTeamMembers.map((m) => m.userId ?? m.user?.id)).size}{" "}
              member
              {new Set(allTeamMembers.map((m) => m.userId ?? m.user?.id))
                .size !== 1
                ? "s"
                : ""}{" "}
              across all teams
            </p>
          </div>

          {/* Search */}
          <div className="tm-search-wrap">
            <svg
              className="tm-search-icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M10.5 10.5l3 3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <input
              className="tm-search-input"
              type="text"
              placeholder="Search teams or members..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
            />
            {teamSearch && (
              <button
                className="tm-search-clear"
                onClick={() => setTeamSearch("")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1l10 10M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="tm-header-actions">
              <button className="tm-pending-btn" onClick={openPending}>
                Pending Invites
              </button>
              <button className="tm-invite-btn" onClick={openAdd}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1v12M1 7h12"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                Add to Team
              </button>
            </div>
          )}
        </header>

        {/* Team cards grid */}
        <div className="tm-body">
          {loading ? (
            <div className="tm-teams-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="tm-skeleton" />
              ))}
            </div>
          ) : Object.keys(filteredTeamGroups).length === 0 ? (
            <div className="tm-empty">
              {teamSearch ? `No results for "${teamSearch}"` : "No teams found"}
            </div>
          ) : (
            <div className="tm-teams-grid">
              {Object.entries(filteredTeamGroups).map(
                ([teamName, members], gi) => (
                  <div
                    key={teamName}
                    className="tm-team-card"
                    onClick={() => {
                      setSelectedTeam(teamName);
                      refreshTasks();
                    }}
                  >
                    <div className="tm-team-card-top">
                      <div
                        className="tm-team-icon"
                        style={{
                          background:
                            AVATAR_COLORS[gi % AVATAR_COLORS.length] + "22",
                          color: AVATAR_COLORS[gi % AVATAR_COLORS.length],
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <circle
                            cx="7"
                            cy="6"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="M1 17c0-3.314 2.686-6 6-6"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="14"
                            cy="6"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="M11 17c0-3.314 1.343-6 3-6s3 2.686 3 6"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="tm-team-card-info">
                        <span className="tm-team-card-name">{teamName}</span>
                        <span className="tm-team-card-count">
                          {members.length} member
                          {members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="tm-team-avatars">
                      {members.slice(0, 5).map((m, idx) => {
                        const uname = m.user?.username || m.username || "?";
                        return (
                          <div
                            key={m.id ?? idx}
                            className="tm-team-avatar"
                            style={{
                              background:
                                AVATAR_COLORS[
                                  (gi * 5 + idx) % AVATAR_COLORS.length
                                ],
                            }}
                            title={uname}
                          >
                            {uname[0].toUpperCase()}
                          </div>
                        );
                      })}
                      {members.length > 5 && (
                        <div className="tm-team-avatar tm-team-avatar--more">
                          +{members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
      {selectedTeam && teamGroups[selectedTeam] && (
        <div className="tm-modal-overlay" onClick={() => setSelectedTeam(null)}>
          <div
            className="tm-members-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tm-modal-header">
              <div className="tm-modal-title-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle
                    cx="7"
                    cy="6"
                    r="3"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M1 17c0-3.314 2.686-6 6-6"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="14"
                    cy="6"
                    r="3"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M11 17c0-3.314 1.343-6 3-6s3 2.686 3 6"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <h2>{selectedTeam}</h2>
                <span className="tm-modal-member-count">
                  {teamGroups[selectedTeam].length} member
                  {teamGroups[selectedTeam].length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                className="tm-modal-close"
                onClick={() => setSelectedTeam(null)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {isAdmin && (
              <div className="tm-members-modal-actions">
                <button
                  className="tm-mm-btn tm-mm-btn--primary"
                  onClick={() => {
                    setSelectedTeam(null);
                    openAdd("direct");
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1v12M1 7h12"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Add Member
                </button>
                <button
                  className="tm-mm-btn tm-mm-btn--secondary"
                  onClick={() => {
                    setSelectedTeam(null);
                    openAdd("invite");
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M2 4l6 5 6-5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Invite Member
                </button>
              </div>
            )}

            <div className="tm-members-modal-body">
              {teamGroups[selectedTeam].map((m, idx) => {
                const uname = m.user?.username || m.username || "—";
                const email = m.user?.email || m.email || "";
                const role = m.role;
                const memberId = m.userId ?? m.user?.id ?? m.id;
                const memberTasks = tasks.filter(
                  (t) =>
                    t.assignedToId != null &&
                    String(t.assignedToId) === String(memberId),
                );
                const total = memberTasks.length;
                const done = memberTasks.filter(
                  (t) => t.status === "DONE",
                ).length;
                const inReview = memberTasks.filter(
                  (t) => t.status === "IN_REVIEW",
                ).length;
                const inProg = memberTasks.filter(
                  (t) => t.status === "IN_PROGRESS",
                ).length;
                const todo = memberTasks.filter(
                  (t) => t.status === "TODO",
                ).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <div
                    key={`${m.id}-${m._projectId}-${idx}`}
                    className="tm-member-row"
                  >
                    <div
                      className="tm-member-avatar"
                      style={{
                        background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                      }}
                    >
                      {uname[0].toUpperCase()}
                    </div>
                    <div className="tm-member-info">
                      <span className="tm-member-name">{uname}</span>
                      <span className="tm-member-email">{email}</span>
                      {m._projectName && (
                        <span
                          className="tm-member-project tm-member-project--link"
                          onClick={() => {
                            setSelectedTeam(null);
                            navigate(`/board?project=${m._projectId}`);
                          }}
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 10 10"
                            fill="none"
                          >
                            <rect
                              x="1"
                              y="2"
                              width="8"
                              height="7"
                              rx="1"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                            <path
                              d="M3 2V1.5a1 1 0 012 0V2"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                          </svg>
                          {m._projectName}
                        </span>
                      )}
                      {/* ── Task stats grid ── */}
                      <div className="tm-stat-grid">
                        <div className="tm-stat-card tm-stat-card--todo">
                          <span className="tm-stat-num">
                            {tasksLoading ? "…" : todo}
                          </span>
                          <span className="tm-stat-label">To Do</span>
                        </div>
                        <div className="tm-stat-card tm-stat-card--inprog">
                          <span className="tm-stat-num">
                            {tasksLoading ? "…" : inProg}
                          </span>
                          <span className="tm-stat-label">In Progress</span>
                        </div>
                        <div className="tm-stat-card tm-stat-card--review">
                          <span className="tm-stat-num">
                            {tasksLoading ? "…" : inReview}
                          </span>
                          <span className="tm-stat-label">In Review</span>
                        </div>
                        <div className="tm-stat-card tm-stat-card--done">
                          <span className="tm-stat-num">
                            {tasksLoading ? "…" : done}
                          </span>
                          <span className="tm-stat-label">Done</span>
                        </div>
                      </div>
                      {!tasksLoading && (
                        <div className="tm-stat-completion">
                          <div className="tm-stat-bar">
                            <div
                              className="tm-stat-bar-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tm-stat-pct">
                            {total === 0
                              ? "No tasks assigned"
                              : `${pct}% complete`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="tm-member-row-right">
                      <span
                        className="tm-role-badge"
                        style={{
                          color: ROLE_COLORS[role] || "#94a3b8",
                          background: (ROLE_COLORS[role] || "#94a3b8") + "18",
                        }}
                      >
                        {role}
                      </span>
                      {isAdmin && (
                        <button
                          className="tm-remove-btn"
                          title="Remove member"
                          onClick={() => setDeleteTarget(m.id)}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M2 4h12M5 4V2.5A1.5 1.5 0 016.5 1h3A1.5 1.5 0 0111 2.5V4M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="tm-modal-overlay" onClick={closeAdd}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="tm-modal-header">
              <div className="tm-modal-title-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle
                    cx="8"
                    cy="6"
                    r="3.5"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M2 17c0-3.314 2.686-6 6-6"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15 11v6M12 14h6"
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <h2>Add to Team</h2>
              </div>
              <button className="tm-modal-close" onClick={closeAdd}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {addDone ? (
              <div className="tm-invite-success">
                <div className="tm-success-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      fill="#f0fdf4"
                      stroke="#22c55e"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8 14l4 4 8-8"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>
                  {addDone.type === "invite" ? "Invite sent!" : "Member added!"}
                </h3>
                <p>
                  {addDone.type === "invite" ? (
                    <>
                      An invitation email has been sent to{" "}
                      <strong>{addDone.label}</strong>.
                    </>
                  ) : (
                    <>
                      <strong>{addDone.label}</strong> has been added to the
                      project.
                    </>
                  )}
                </p>
                {addDone.type === "invite" && (
                  <p className="tm-invite-note">
                    They will receive a link to register and join the team.
                  </p>
                )}
                <div className="tm-modal-actions">
                  <button
                    className="tm-btn-secondary"
                    onClick={resetToAddAnother}
                  >
                    Add Another
                  </button>
                  <button className="tm-btn-primary" onClick={closeAdd}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="tm-add-tabs">
                  <button
                    className={`tm-add-tab ${addTab === "invite" ? "tm-add-tab--active" : ""}`}
                    onClick={() => switchTab("invite")}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M2 4l6 5 6-5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Invite by Email
                  </button>
                  <button
                    className={`tm-add-tab ${addTab === "direct" ? "tm-add-tab--active" : ""}`}
                    onClick={() => switchTab("direct")}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="7"
                        cy="5"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M2 14c0-2.761 2.239-5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 10v4M10 12h4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Add Existing User
                  </button>
                </div>
                {addTab === "invite" && (
                  <form className="tm-invite-form" onSubmit={handleInvite}>
                    <p className="tm-invite-desc">
                      Send an invitation email with a registration link to join
                      the team.
                    </p>

                    {inviteError && (
                      <div className="tm-form-error">{inviteError}</div>
                    )}

                    <div className="tm-form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) =>
                          setInviteForm({
                            ...inviteForm,
                            email: e.target.value,
                          })
                        }
                        placeholder="colleague@example.com"
                        autoFocus
                      />
                    </div>

                    <div className="tm-form-row">
                      <div className="tm-form-group">
                        <label>Role</label>
                        <select
                          value={inviteForm.role}
                          onChange={(e) =>
                            setInviteForm({
                              ...inviteForm,
                              role: e.target.value,
                            })
                          }
                        >
                          <option value="DEVELOPER">Developer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>

                      <div className="tm-form-group">
                        <label>Project (optional)</label>
                        <select
                          value={inviteForm.projectId}
                          onChange={(e) =>
                            setInviteForm({
                              ...inviteForm,
                              projectId: e.target.value,
                            })
                          }
                        >
                          <option value="">No specific project</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="tm-modal-actions">
                      <button
                        type="button"
                        className="tm-btn-secondary"
                        onClick={closeAdd}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="tm-btn-primary"
                        disabled={inviteSaving}
                      >
                        {inviteSaving ? "Sending..." : "Send Invite"}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Tab: Add Existing User ── */}
                {addTab === "direct" && (
                  <form className="tm-invite-form" onSubmit={handleDirectAdd}>
                    <p className="tm-invite-desc">
                      Add an existing user directly to a project — no email
                      needed.
                    </p>

                    {directError && (
                      <div className="tm-form-error">{directError}</div>
                    )}

                    <div className="tm-form-row">
                      <div className="tm-form-group">
                        <label>User *</label>
                        <select
                          value={directForm.userId}
                          onChange={(e) =>
                            setDirectForm({
                              ...directForm,
                              userId: e.target.value,
                            })
                          }
                        >
                          <option value="">Select a user</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username} — {u.email}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="tm-form-group">
                        <label>Role</label>
                        <select
                          value={directForm.role}
                          onChange={(e) =>
                            setDirectForm({
                              ...directForm,
                              role: e.target.value,
                            })
                          }
                        >
                          <option value="DEVELOPER">Developer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="tm-form-group">
                      <label>Project *</label>
                      <select
                        value={directForm.projectId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          const proj = projects.find(
                            (p) => String(p.id) === pid,
                          );
                          const existingTeamId = proj?.team?.id
                            ? String(proj.team.id)
                            : "";
                          setDirectForm({
                            ...directForm,
                            projectId: pid,
                            teamMode: existingTeamId ? "existing" : "new",
                            teamId: existingTeamId,
                            newTeamName: "",
                          });
                        }}
                      >
                        <option value="">Select a project</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.team ? ` (${p.team.name})` : " (no team)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Team selection — existing or new */}
                    {directForm.projectId &&
                      (() => {
                        const existingTeams = Object.values(
                          projects.reduce((acc, p) => {
                            if (p.team?.id) acc[p.team.id] = p.team;
                            return acc;
                          }, {}),
                        );
                        return (
                          <div className="tm-team-section">
                            <label className="tm-form-label">Team *</label>
                            <div className="tm-team-mode-toggle">
                              <button
                                type="button"
                                className={`tm-team-mode-btn ${directForm.teamMode === "existing" ? "tm-team-mode-btn--active" : ""}`}
                                onClick={() =>
                                  setDirectForm({
                                    ...directForm,
                                    teamMode: "existing",
                                    newTeamName: "",
                                  })
                                }
                              >
                                Use Existing Team
                              </button>
                              <button
                                type="button"
                                className={`tm-team-mode-btn ${directForm.teamMode === "new" ? "tm-team-mode-btn--active" : ""}`}
                                onClick={() =>
                                  setDirectForm({
                                    ...directForm,
                                    teamMode: "new",
                                    teamId: "",
                                  })
                                }
                              >
                                Create New Team
                              </button>
                            </div>

                            {directForm.teamMode === "existing" ? (
                              existingTeams.length > 0 ? (
                                <select
                                  value={directForm.teamId}
                                  onChange={(e) =>
                                    setDirectForm({
                                      ...directForm,
                                      teamId: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Select a team</option>
                                  {existingTeams.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="tm-no-teams-note">
                                  No teams exist yet. Switch to "Create New
                                  Team".
                                </p>
                              )
                            ) : (
                              <input
                                type="text"
                                value={directForm.newTeamName}
                                onChange={(e) =>
                                  setDirectForm({
                                    ...directForm,
                                    newTeamName: e.target.value,
                                  })
                                }
                                placeholder="e.g. Backend Team"
                              />
                            )}
                          </div>
                        );
                      })()}

                    <div className="tm-modal-actions">
                      <button
                        type="button"
                        className="tm-btn-secondary"
                        onClick={closeAdd}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="tm-btn-primary"
                        disabled={directSaving}
                      >
                        {directSaving ? "Adding..." : "Add to Team"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {showPending && (
        <div className="tm-modal-overlay" onClick={() => setShowPending(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-header">
              <div className="tm-modal-title-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle
                    cx="10"
                    cy="10"
                    r="8.5"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M10 6v4l2.5 2.5"
                    stroke="#6366f1"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <h2>Pending Invites</h2>
              </div>
              <button
                className="tm-modal-close"
                onClick={() => setShowPending(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="tm-pending-body">
              <div className="tm-form-group">
                <label>Filter by Project</label>
                <select
                  value={pendingProject}
                  onChange={(e) => {
                    setPendingProject(e.target.value);
                    setPendingEmailQuery("");
                    loadPendingByProject(e.target.value);
                  }}
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tm-form-group">
                <label>Or search by Email</label>
                <div className="tm-pending-email-row">
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={pendingEmailQuery}
                    onChange={(e) => setPendingEmailQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tm-btn-secondary"
                    onClick={() => {
                      setPendingProject("");
                      loadPendingByEmail(pendingEmailQuery);
                    }}
                  >
                    Search
                  </button>
                </div>
              </div>

              {pendingError && (
                <div className="tm-form-error">{pendingError}</div>
              )}

              {pendingLoading ? (
                <p className="tm-detail-empty">Loading...</p>
              ) : pendingInvites.length === 0 ? (
                <p className="tm-detail-empty">No pending invites found.</p>
              ) : (
                <div className="tm-pending-list">
                  {pendingInvites.map((inv) => (
                    <div key={inv.token ?? inv.id} className="tm-pending-row">
                      <div className="tm-pending-info">
                        <span className="tm-pending-email">{inv.email}</span>
                        <span
                          className="tm-role-badge"
                          style={{
                            color: ROLE_COLORS[inv.role] || "#94a3b8",
                            background:
                              (ROLE_COLORS[inv.role] || "#94a3b8") + "18",
                          }}
                        >
                          {inv.role}
                        </span>
                        {inv.status && (
                          <span className="tm-invite-status">{inv.status}</span>
                        )}
                      </div>
                      {(!inv.status || inv.status === "PENDING") && (
                        <button
                          className="tm-decline-btn"
                          onClick={() => handleDecline(inv.token)}
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Remove Member"
          message="Are you sure you want to remove this member from the team? This action cannot be undone."
          confirmLabel="Remove"
          onConfirm={handleRemoveMember}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
